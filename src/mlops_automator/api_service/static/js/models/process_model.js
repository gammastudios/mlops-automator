

// possible process status states
export const ProcessStatus =  Object.freeze({
    RUNNING: 'running',
    STOPPED: 'stopped',
    INIT: 'init',
});

export class ProcessModel {
    constructor(
        processName,
        processStatus,
        cycleTime,
        cycleCount,
        lastCycleDttm
    ) {
        this.processName = processName;
        this.processStatus = processStatus;
        this.cycleTime = cycleTime;
        this.cycleCount = cycleCount;
        this.lastCycleDttm = lastCycleDttm;
        this.desiredStatus = null;
    }

    isRunning = () => {
        // if there is a desired stat
        let effectiveStatus = this.desiredStatus || this.processStatus;
        return effectiveStatus === ProcessStatus.RUNNING;
    }

    isStopped = () => {
        return ! this.isRunning();
    }

    isUpdatingStatus = () => {
        // if there is a previous status, then the status is also indeterminant
        return this.desiredStatus !== null;
    }

    isInitial = () => {
        return this.processStatus === ProcessStatus.INIT;
    }

    #updateRequest = (body) => new Promise((resolve, reject) => {
        // send the update API request
        m.request({
            method: "PATCH",
            url: "/process/" + this.processName,
            body: body
        })
        .then(data => resolve(data))
        .catch(error => reject(error));
    })


    update = (newValues) => new Promise((resolve, reject) => {
        // API key to app Key mapping
        let apiKeys = {
            cycleTime: 'cycle_time'
        }
        let requestBody = {};
        for (let key in newValues) {
            if (key in apiKeys) {
                requestBody[apiKeys[key]] = newValues[key];
            }
        }
        this.#updateRequest(requestBody)
        .then(data => resolve(data))
        .catch((error) => reject(error))
    })


    // toggle the running/stopped status of the process
    toggleStatus = () => new Promise((resolve, reject) => {
        let newStatus = this.isRunning() ? ProcessStatus.STOPPED : ProcessStatus.RUNNING;
        this.desiredStatus = newStatus;
        this.#updateRequest( { status: newStatus } )
        .then(data => resolve(data))
        .catch((error) => reject(error))
    })

};
