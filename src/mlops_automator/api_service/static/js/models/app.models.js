
export var app = app || {};

// refresh rate in milliseconds
const refreshRate = 5000;

// possible refresh states
export const RefreshState = Object.freeze({
    AUTO: 'auto',
    MANUAL: 'manual',
    OFF: 'off'
});

// load the app with refresh enabled
// var refreshState = RefreshState.AUTO;

class AppModel {
    #refreshState;

    constructor(refreshState=RefreshState.AUTO) {
        this.items = {
            processes: [{}],
            tasks: [{}]
        };
        this.#refreshState = refreshState;
        // used to manage async process status updates with starting/stopping processes
        // uses process name/id as key and status as value
        this.prevProcessStatus = {};
        // used to manage async task start updates
        // uses task id as key, value is ignored
        this.prevTaskId = {};
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

    #updateItemSet(itemSet, data) {
        this.items[itemSet] = data[itemSet];
        if (itemSet === ItemGroup.GroupKey.PROCESSES) {
            this.items[itemSet].forEach(process => {
                // if there is a previous status that is different from latest status remove the update flag
                if (this.prevProcessStatus[process.name] !== undefined) {
                    if (this.prevProcessStatus[process.name] !== process.status)
                        delete this.prevProcessStatus[process.name];
                }
            });
        } else if (itemSet === ItemGroup.GroupKey.TASKS) {
            this.items[itemSet].forEach(task => {
                // if there is a previous status that is different from latest status remove the update flag
                if (this.prevTaskId[task.name] !== undefined) {
                    if (this.prevTaskId[task.name] !== task.id) {
                        delete this.prevTaskId[task.name];
                    }
                }
            });
        }
    };

    refreshItems = (itemSet) => {
        return new Promise((resolve, reject) => {
            resolve(m.request({
                    method: "GET",
                    url: "/" + itemSet
                })
                .then((data) => { this.#updateItemSet(itemSet, data) })
                .catch(error => {
                    console.error("Error fetching " + itemSet + ":", error);
                })
            )
        })
    }

    // refresh all the item groups
    refreshAllItems = () => {
        return new Promise((resolve, reject) => {
            Promise.all(
                Object.keys(ItemGroup.GroupKey).map(groupKey => 
                    this.refreshItems(ItemGroup.GroupKey[groupKey])
                )
            )
            .then(resolve)
            .catch(reject);
        })
    }

    // enable data fetching for a group of items
    startFetchingByGroup(itemGroup) {
        this.refreshItems(itemGroup.groupName);
        if (itemGroup.intervalId === null) {
            itemGroup.intervalId = setInterval(this.refreshItems, refreshRate, itemGroup.groupName);
        }
    }

    // stop data fetching for a group of items
    stopFetchingByGroup(itemGroup) {
        if (itemGroup.intervalId) {
            clearInterval(itemGroup.intervalId);
            itemGroup.intervalId = null;
        }
    }
};

// TODO - move this to controller once controller is ready
app.model = new AppModel();


export class ProcessModel {
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
        resolve(
            m.request({
                method: "PATCH",
                url: "/process/" + process.name,
                body: newValues
            })
            .then(data => resolve(data))
            .catch(error => reject(error))
        );
    })
};


export class TaskModel {
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

    updateTaskItem = (task, updateValues) => new Promise((resolve, reject) => {
        // only send attributes with different values
        let newValues = {};
        for (let key in updateValues) {
            if (task[key] !== updateValues[key]) {
                newValues[key] = updateValues[key];
            }
        };
        resolve(
            m.request({
                method: "PATCH",
                url: "/tasks/" + task.name,
                body: newValues
            })
            .then(data => resolve(data))
            .catch(error => reject(error))
        )
    })
}


export const ItemGroup = {
    GroupKey: Object.freeze({
        PROCESSES: 'processes',
        TASKS: 'tasks'
    })
};