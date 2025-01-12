
import { ProcessModel, ProcessStatus } from './process_model.js';
import { TaskModel } from './task_model.js';

// possible refresh states
export const RefreshState = Object.freeze({
    AUTO: 'auto',
    MANUAL: 'manual',
    OFF: 'off'
});


// dict key used for Group Items - maps to the API path
export const ItemGroupKey = Object.freeze({
    PROCESSES: 'processes',
    TASKS: 'tasks'
});


// item grouping for tasks and processes
class ItemGroup {
    constructor(groupKey) {
        this.groupKey = groupKey;
        this.groupName = groupKey;
        this.intervalId = null;
        this.items = [];
    }
}


export class AppModel {
    #refreshRate;
    #refreshState;

    constructor(refreshState=RefreshState.AUTO, refreshRate=5000) {
        this.itemGroups = { 
            processes: new ItemGroup(ItemGroupKey.PROCESSES),
            tasks: new ItemGroup(ItemGroupKey.TASKS)
        };

        this.#refreshState = refreshState;
        this.#refreshRate = refreshRate;
    };

    refreshStateIsManual() {
        return this.#refreshState === RefreshState.MANUAL;
    };

    refreshStateIsAuto() {
        return this.#refreshState === RefreshState.AUTO;
    };

    refreshStateIsOff() {
        return this.#refreshState === RefreshState.OFF;
    };

    isRefreshing() {
        return this.refreshStateIsAuto() || this.refreshStateIsManual();
    };

    getRefreshState() {
        return this.#refreshState;
    }
    
    setRefreshState(refreshState) {
        // TODO - add some validation checking
        this.#refreshState = refreshState;
    }

    setRefreshStateToManual() {
        this.setRefreshState(RefreshState.MANUAL);
    }

    toggleRefreshState() {
        if (this.refreshStateIsOff()) {
            this.startFetching();
        } else {
            this.stopFetching();
        }
    }

    #loadProcessGroup = (processesData) => {
        processesData.map((p) => {
            // if the process already exists, then update the existing attributes, o.w. create a new process object
            let existingProcess = this.itemGroups[ItemGroupKey.PROCESSES].items.find(process => process.processName === p.name);
            if (existingProcess) {
                existingProcess.processStatus = p.status;
                existingProcess.cycleTime = p.cycle_time;
                existingProcess.cycleCount = p.cycles_completed;
                existingProcess.lastCycleDttm = p.last_cycle_dttm;
                if (existingProcess.desiredStatus !== null) {
                    if (existingProcess.desiredStatus === p.status || p.status === ProcessStatus.INIT) {
                        existingProcess.desiredStatus = null;
                    }
                }
            } else {
                p = new ProcessModel(
                    p.name,
                    p.status,
                    p.cycle_time,
                    p.cycles_completed,
                    p.last_cycle_dttm
                )
                this.itemGroups[ItemGroupKey.PROCESSES].items.push(p);
            }
        })
    }

    #loadTaskGroup = (tasksData) => {
        tasksData.map((t) => {
            // if the task already exists, then update the existing attributes, o.w. create a new task object
            let existingTask = this.itemGroups[ItemGroupKey.TASKS].items.find(task => task.taskName === t.name);
            if (existingTask) {
                existingTask.taskStatus = t.status;
                existingTask.taskDuration = t.duration;
                existingTask.taskStartDttm = t.start_dttm;
                existingTask.taskFinishDttm = t.finish_dttm;
                existingTask.taskInstanceId = t.id;
                if (existingTask.prevTaskInstanceId !== null) {
                    if (existingTask.prevTaskInstanceId !== t.id) {
                        existingTask.prevTaskInstanceId = null;
                    }
                }
            } else {
                t = new TaskModel(
                    t.name,
                    t.status,
                    t.duration,
                    t.start_dttm,
                    t.finish_dttm,
                    t.id
                )
                this.itemGroups[ItemGroupKey.TASKS].items.push(t);
            }
        })
    }

    #updateItemGroup = (itemGroupKey, data) => {
        if (itemGroupKey === ItemGroupKey.PROCESSES) {
            this.#loadProcessGroup(data[itemGroupKey]);
        } else if (itemGroupKey === ItemGroupKey.TASKS) {
            this.#loadTaskGroup(data[itemGroupKey]);
        }
    };

    refreshItems = (itemGroupKey) => {
        return new Promise((resolve, reject) => {
            resolve(m.request({
                    method: "GET",
                    url: "/" + itemGroupKey
                })
                .then((data) => { this.#updateItemGroup(itemGroupKey, data) })
                .catch(error => {
                    console.error("Error fetching " + itemGroupKey + ":", error);
                })
            )
        })
    }

    // refresh all the item groups
    refreshAllItems = () => {
        return new Promise((resolve, reject) => {
            Promise.all(
                Object.keys(this.itemGroups).map(groupKey => 
                    this.refreshItems(this.itemGroups[groupKey].groupKey)
                )
            )
            .then(resolve)
            .catch(reject);
        })
    }

    // enable data fetching for a group of items
    startFetchingByGroup = (itemGroupKey) => {
        let itemGroup = this.itemGroups[itemGroupKey];
        this.refreshItems(itemGroupKey);
        if (itemGroup.intervalId === null) {
            itemGroup.intervalId = setInterval(this.refreshItems, this.#refreshRate, itemGroup.groupKey);
        }
    }

    startFetching = () => {
        this.setRefreshState(RefreshState.AUTO);
        for (let groupKey in this.itemGroups) {
            this.startFetchingByGroup(groupKey);
        };
        this.setRefreshState(RefreshState.AUTO);
    }

    // stop data fetching for a group of items
    stopFetchingByGroup = (itemGroupKey) => {
        let itemGroup = this.itemGroups[itemGroupKey];
        if (itemGroup.intervalId) {
            clearInterval(itemGroup.intervalId);
            itemGroup.intervalId = null;
        }
    }

    stopFetching = () => {
        for (let groupKey in this.itemGroups) {
            this.stopFetchingByGroup(groupKey);
        };
        this.setRefreshState(RefreshState.OFF);
    }
};
