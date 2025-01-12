

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
        this.prevItem = {};
    }
}


export class AppModel {
    #refreshRate;
    #refreshState;

    constructor(refreshState=RefreshState.AUTO, refreshRate=5000) {
        this.items = {
            processes: [],
            tasks: []                
        };
        this.itemGroups = { 
            processes: new ItemGroup(ItemGroupKey.PROCESSES),
            tasks: new ItemGroup(ItemGroupKey.TASKS)
        };

        this.#refreshState = refreshState;
        this.#refreshRate = refreshRate;

        // used to manage async process status updates with starting/stopping processes
        // uses process name/id as key and status as value
        this.prevProcessStatus = {};
        // used to manage async task start updates
        // uses task id as key, value is ignored
        this.prevTaskId = {};
    };

    // possible refresh states
    RefreshState = Object.freeze({
        AUTO: 'auto',
        MANUAL: 'manual',
        OFF: 'off'
    })

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

    #updateItemGroup(itemGroupKey, data) {
        this.items[itemGroupKey] = data[itemGroupKey];
        // this.itemGroups[itemGroupKey].items = data[itemGroupKey];
        if (itemGroupKey === ItemGroupKey.PROCESSES) {
            this.items[itemGroupKey].forEach(process => {
                // if there is a previous status that is different from latest status remove the update flag
                if (this.prevProcessStatus[process.name] !== undefined) {
                    if (this.prevProcessStatus[process.name] !== process.status)
                        delete this.prevProcessStatus[process.name];
                }
            }); 
        } else if (itemGroupKey === ItemGroupKey.TASKS) {
            this.items[itemGroupKey].forEach(task => {
                // if there is a previous status that is different from latest status remove the update flag
                if (this.prevTaskId[task.name] !== undefined) {
                    if (this.prevTaskId[task.name] !== task.id) {
                        delete this.prevTaskId[task.name];
                    }
                }
            });
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
        // this.itemGroups.forEach(group => this.stopFetchingByGroup(group.groupKey));
        for (let groupKey in this.itemGroups) {
            this.stopFetchingByGroup(groupKey);
        };
        this.setRefreshState(RefreshState.OFF);
    }
};

// TODO - move this to controller once controller is ready
// app.model = new AppModel();


export class ProcessFactory {
    constructor() {
        this.processes = [];
    }

    // possible process status states
    static ProcessStatus =  Object.freeze({
        RUNNING: 'running',
        STOPPED: 'stopped',
        INIT: 'init'
    })

    static toggleProcessItem = (process) => new Promise((resolve, reject) => {
        // Sends an API request to toggle the state of a process item
        resolve(
            m.request({
                method: "PATCH",
                url: "/process/" + process.name,
                body: {
                    status: process.status === this.ProcessStatus.RUNNING ? this.ProcessStatus.STOPPED : this.ProcessStatus.RUNNING
                }
            })
            .catch(error => { })
        )
    })

    // update process attributes, if different from the current process values
    static updateProcessItem = (process, updateValues) => new Promise((resolve, reject) => {
        // only send attributes with different values
        let newValues = {};
        for (let key in updateValues) {
            if (process[key] !== updateValues[key]) {
                newValues[key] = updateValues[key];
            }
        };
        // submit the patch request regardless of whether there are any changes and retun the result
        m.request({
            method: "PATCH",
            url: "/process/" + process.name,
            body: newValues
        })
        .then(data => resolve(data))
        .catch(error => reject(error));
    })
};


export class TaskFactory {
    constructor() {
        // this.tasks = [];
    }

    static TaskStatus = Object.freeze({
        RUNNING: 'running',
        FINISHED: 'finished',
        INIT: 'init'
    })        

    static startTask = (task) => new Promise((resolve, reject) => {
        // Send an API request to start a task
        resolve(
            m.request({
                method: "POST",
                url: "/tasks/" + task.name,
                body: { }
            })
            .catch(error => {
                // TODO - better error handling for 409 Conflict responses
                console.error("Error starting task " + task.name + ":", error);
            })
        )
    })

    static updateTaskItem = (task, updateValues) => new Promise((resolve, reject) => {
        // only send attributes with different values
        let newValues = {};
        for (let key in updateValues) {
            if (task[key] !== updateValues[key]) {
                newValues[key] = updateValues[key];
            }
        };
        m.request({
            method: "PATCH",
            url: "/tasks/" + task.name,
            body: newValues
        })
        .then(data => resolve(data))
        .catch(error => reject(error));
    })
}


