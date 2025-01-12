

// possible task status states
export const TaskStatus = Object.freeze({
    RUNNING: 'running',
    FINISHED: 'finished',
    INIT: 'init'
});


export class TaskModel {
    constructor(
        taskName,
        taskStatus,
        taskDuration,
        taskStartDttm,
        taskFinishDttm,
        taskInstanceId
    ) {
        this.taskName = taskName;
        this.taskStatus = taskStatus;
        this.taskDuration = taskDuration;
        this.taskStartDttm = taskStartDttm;
        this.taskFinishDttm = taskFinishDttm;
        this.taskInstanceId = taskInstanceId;
        // this.desiredStatus = null;
        this.prevTaskInstanceId = null;
    }


    startTaskInstance = () => new Promise((resolve, reject) => {
        // TODO - better error handling if there's already task instance starting
        if (! this.isStartingTaskInstance()) {
            this.prevTaskInstanceId = this.taskInstanceId;
            // send the start task API request
            m.request({
                method: "POST",
                url: "/tasks/" + this.taskName,
                body: {}
            })
            .then(data => resolve(data))
            .catch(error => reject(error));
        } // else do nothing
    })

    isRunning = () => {
        return this.taskStatus === TaskStatus.RUNNING;
    }

    isFinished = () => {
        return this.taskStatus === TaskStatus.FINISHED;
    }

    isInitial = () => {
        return this.taskStatus === TaskStatus.INIT;
    }

    isStartingTaskInstance = () => {
        // indeterminate state when requesting to start a task but running status hasn't been returned
        return this.prevTaskInstanceId !== null;
    }

    #updateRequest = (body) => new Promise((resolve, reject) => {
        // send the update API request
        m.request({
            method: "PATCH",
            url: "/tasks/" + this.taskName,
            body: body
        })
        .then(data => resolve(data))
        .catch(error => reject(error));
    })


    update = (newValues) => new Promise((resolve, reject) => {
        // API key to app Key mapping
        let apiKeys = {
            taskDuration: 'duration'
        }
        let requestBody = {};
        for (let key in newValues) {
            if (key in apiKeys) {
                requestBody[apiKeys[key]] = newValues[key];
            }
        }
        this.#updateRequest(requestBody)
        .then(data => resolve(data))
        .catch(error => reject(error));
    })


}