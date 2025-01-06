// Required if API is served by a different web server than the ui
// const API_URL = "http://localhost:8000";
import { DateTime } from "/web/static/js/luxon.js";


// -----------------------------
// Modal components
// const Modal = {
//     view: (v) => [
//         // m('div.modal',
//         m("modal", { class: "ui  modal active" },
//             m('div', { class: "header" }, 'Update Process Settings: ' + v.attrs.processName),
//             m('div', { class: "content" }, 'hello 002'),
//             m("div", { class: "actions" },
//                 m('button', { 
//                     class: "ui close button",
//                     onclick: () => showProcessSettingsModal[v.attrs.processName] = false 
//                 }, 'Close')
//             )
//         )
//     ]
// }


// -----------------------------
// model

const ItemGroup = Object.freeze({
    PROCESSES: 'processes',
    TASKS: 'tasks'
});

// possible refresh states
const RefreshState = Object.freeze({
    AUTO: 'auto',
    MANUAL: 'manual',
    OFF: 'off'
});

// possible process status states
const ProcessStatus = Object.freeze({
    RUNNING: 'running',
    STOPPED: 'stopped',
    INIT: 'init'
});

// possible task status states
const TaskStatus = Object.freeze({
    RUNNING: 'running',
    FINISHED: 'finished',
    INIT: 'init'
});

// keys must align with labels in ItemGroup
var items = {
    processes: [],
    tasks: []
};

// load the app with refresh enabled
var refreshState = RefreshState.AUTO;

// used to manage async process status updates with starting/stopping processes
var prevProcessStatus = {};

// used to manage async task start updates
var prevTaskStatus = {};

// refresh rate in milliseconds
var refreshRate = 5000;


const toggleProcessItem = (process) => {
    // Sends an API request to toggle the state of a process item
    m.request({
        method: "PATCH",
        url: "/process/" + process.name,
        body: {
            status: process.status === ProcessStatus.RUNNING ? ProcessStatus.STOPPED : ProcessStatus.RUNNING
        }
    })
    .catch(error => {
    });

};


const formatDttm = (dttmStr, defaultLowDttmStr="-") => {
    // timestamp formatter, with special handling for low dttm values
    let trgtDttm = DateTime.fromISO(dttmStr);
    let lowDttm = DateTime.fromISO('1900-01-01T00:00:00+00:00');

    if (trgtDttm.toMillis() == lowDttm.toMillis()) {
        return defaultLowDttmStr;
    } else {
        return trgtDttm.toISO();
    }
};


const sinceLastProcessCycle = (process, defaultNoCycleStr="-") => {
    let trgtDttm = DateTime.fromISO(process.last_cycle_dttm);
    let lowDttm = DateTime.fromISO('1900-01-01T00:00:00+00:00');
    if (trgtDttm.toMillis() == lowDttm.toMillis()) {
        return defaultNoCycleStr;
    } else {
        return trgtDttm.toRelative({
            style: "short", 
            locale: "en", 
            units: ["days", "hours", "minutes", "seconds"] 
        });
    }
}

const sinceLastTask = (task, defaultNoDurationStr="-") => {
    // based on status and start/finish times, provide a string representation of the duration since last finish
    if (task.status !== TaskStatus.FINISHED) {
        return defaultNoDurationStr;
    } else {
        return DateTime.fromISO(task.finish_dttm)
            .toRelative({
                style: "short", 
                locale: "en", 
                units: ["days", "hours", "minutes", "seconds"] 
            })
    }
};

// refresh a set of items from the API service
const refreshItems = (itemSet) => new Promise((resolve, reject) => {
    resolve(m.request({
            method: "GET",
            url: "/" + itemSet
        })
        .then(data => {
            items[itemSet] = data[itemSet];
            if (itemSet === ItemGroup.PROCESSES) {
                items[itemSet].forEach(process => {
                    // if there is a previous status that is different from latest status remove the update flag
                    if (prevProcessStatus[process.name] !== undefined) {
                        if (prevProcessStatus[process.name] !== process.status)
                            delete prevProcessStatus[process.name];
                    }
                });
            } else if (itemSet === ItemGroup.TASKS) {
                items[itemSet].forEach(task => {
                    // if there is a previous status that is different from latest status remove the update flag
                    if (prevTaskStatus[task.name] !== undefined) {
                        if (prevTaskStatus[task.name] !== task.status) {
                            delete prevTaskStatus[task.name];
                        }
                    }
                });
            }
        })
        .catch(error => {
            console.error("Error fetching " + itemSet + ":", error);
        })
    )
});


const startTask = (task) => new Promise((resolve, reject) => {
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
});


// refresh all the item groups
const refreshAllItems = () => new Promise((resolve, reject) => {
    Promise.all(itemGroups.map(itemGroup => refreshItems(itemGroup.groupName)))
        .then(resolve)
        .catch(reject);
})


// enable data fetching for a group of items
const startFetchingByGroup = (itemGroup) => {
    refreshItems(itemGroup.groupName);
    if (itemGroup.intervalId === null) {
        itemGroup.intervalId = setInterval(refreshItems, refreshRate, itemGroup.groupName);
    }
};


// stop data fetching for a group of items
const stopFetchingByGroup = (itemGroup) => {
    if (itemGroup.intervalId) {
        clearInterval(itemGroup.intervalId);
        itemGroup.intervalId = null;
    }
};


// -----------------------------
// UI components

// refresh control menu buttons
const RefreshButton = {
    // ensures a short animation of the refresh button for user feedback
    animationDelay: 500,
    // https://mithril-by-examples.js.org/examples/loading-button-component/
    view: (v) =>
        m("button", {
                class: refreshState === RefreshState.MANUAL ? "ui active button" : "ui button",
                onclick: () => {
                    let prevRefreshState = refreshState;
                    refreshState = RefreshState.MANUAL;
                    m.redraw();
                    // ensures a 1/2 second delay before reverting to previous refresh state
                    const startTime = Date.now();
                    refreshAllItems().then((response) => {
                        const elapsedTime = Date.now() - startTime;
                        const remainingTime = RefreshButton.animationDelay - elapsedTime;
                        if (remainingTime > 0) {
                            setTimeout(() => {
                                refreshState = prevRefreshState;
                                m.redraw();
                            }, remainingTime);
                        } else {
                            refreshState = prevRefreshState;
                            m.redraw();
                        }
                    })
                }
            },
            m("i", { class: refreshState === RefreshState.MANUAL ? "ui loading refresh icon": "ui refresh icon" }, "")
        )
};


const PlayButton = {
    view: (v) =>
        m("button", { 
            class: refreshState === RefreshState.AUTO ? "ui active button" : "ui button", 
            onclick: App.startFetching },
        m("i", { class: "ui play icon" }, "")
    )
};


const PauseButton = {
    view : (v) =>
        m("button", {
            class: refreshState === RefreshState.OFF ? "ui active button" : "ui button",
            onclick: App.stopFetching
        },
        m("i", { class: "ui pause icon"})
    )
};


const StatusButton = {
    view: (v) =>
        m("div", { 
            class: refreshState === RefreshState.AUTO || refreshState === RefreshState.MANUAL ? "small ui active green button" :
                    "small ui active grey button",
                onclick: App.toggleFetching,
                style: "width: 150px"
            },
            refreshState === RefreshState.AUTO ? "Monitoring" : 
                refreshState === RefreshState.OFF ? "Paused" : "Refreshing"
    )
};


const Header = {
   view: (v) => {
        return m("div", { class: "ui inverted menu grey"},
            m("div", { class: "ui fluid container" }, 
                m("div", { class: "header item" }, "MLOps-omator"),
                m("div", { class: "right item" },
                    m("div", { class: "ui horizontal icon buttons" }, [
                        m(RefreshButton, {}, ""),
                        m(PlayButton, {}, ""),
                        m(PauseButton, {}, ""),
                        m(StatusButton, {}, "")
                    ])
                )
            )
        );
    }
};


const itemGroupDivider = (groupLabel, groupIcon) => {
    return m(
        "div", { class: "row" },
            m("div", { class: "column" },
                m("h4", { class: "ui horizontal divider header" }, 
                m("i", { class: "ui " + groupIcon + " icon" }, ""),
                groupLabel
            ))
    )
};


const ToggleProcessButton = (process) => {
    return m(
        "div", { class: "ui toggle checkbox" }, 
            m("input", {
                type: "checkbox", 
                checked: process.status === ProcessStatus.RUNNING,
                onclick: (event) => {
                    prevProcessStatus[process.name] = process.status;
                    toggleProcessItem(process);  
                },
                disabled: prevProcessStatus[process.name] !== undefined
            }),
            m("label", "", "")
    );
};


const RunTaskButton = (task) => {
    return m("div", {class: ""}, [
        m("button", {
                class: task.status === TaskStatus.RUNNING ? "ui green small labeled icon button" : "ui small labeled icon button",
                style: "width: 120px",
                onclick: () => {
                    prevTaskStatus[task.name] = task.status;
                    startTask(task)
                },
                disabled: (prevTaskStatus[task.name] !== undefined || task.status === TaskStatus.RUNNING),
            },
            m("i", { 
                class: task.status === TaskStatus.RUNNING ? "ui loading spinner icon" : "ui play icon" 
            }, ""),
            m("span", { class: "" }, 
                task.status === TaskStatus.RUNNING ? "Running" : "Start"
            )
        ),
    ]);
};


const ProcessStatusIndicator = (process) => {
    return m("i", { 
        class: prevProcessStatus[process.name] !== undefined ? "ui grey loading spinner icon" : 
               process.status === ProcessStatus.RUNNING ? "ui teal chevron circle right icon" : 
               process.status === ProcessStatus.STOPPED ? "ui red stop circle outline icon" : "ui yellow question circle icon"
    }, "");
};


const TaskStatusIndicator = (task) => {
    return m("i", {
        class: prevTaskStatus[task.name] !== undefined ? "ui loading spinner icon" :
            task.status === TaskStatus.RUNNING ? "ui loading spinner icon" :
            task.status === TaskStatus.FINISHED ? "ui green check icon" : "ui yellow question circle icon"
    }, "");
};

var showProcessSettingsModal = { process1: false, process2: false }; ;
var showTaskSettingsModal = false;

const ProcessSettingsButton = (process) => {
    // open a modal dialog box to enable changing process attributes and submit the changes
    return m("div", {} ,
            m("button", { 
                    id: "p-settings-b-" + process.name,
                    class: "ui small icon button",
                    type: "button",
                    onclick: () => { 
                        $('.dimmable').dimmer('show');
                        showProcessSettingsModal[process.name] = true;
                        console.log("settings button clicked: " + process.name);
                    },
                },
                m("i", { class: "ui settings icon" }, "")),
            showProcessSettingsModal[process.name] && m(ProcessSettingsModal, { processName: process.name }, "")
    );
};

const TaskSettingsButton = (task) => {
    // open a modal dialog box to enable changing task attributes and submit the changes
    return m("button", {
        class: "ui small icon button"
    },
        m("i", { class: "ui settings icon" }, "")
    );
};

const ProcessSettingsModal = { 
    view: (v) => [
        // m('div.modal',
        m("modal", { class: "ui overlay modal active", },
            m('div', { class: "header" }, 'Update Process Settings: ' + v.attrs.processName),
            m('div', { class: "content" }, 'hello 002'),
            m("div", { class: "actions" },
                m('div', { 
                    class: "ui close button",
                    onclick: () => { 
                        // $('.dimmable').dimmer('hide');
                        showProcessSettingsModal[v.attrs.processName] = false;
                        console.log("close button clicked: " + v.attrs.processName);
                    }
                }, 'Close')
            )
        )
    ]
}

const TaskSettingsModal = (task) => {
    return () => { m("div", { class: "ui modal" }, "task says hello") }
}

const ProcessGroupTable = {
    intervalId: null,
    groupName: ItemGroup.PROCESSES,

    oninit: function() {
        startFetchingByGroup(ProcessGroupTable);
    },
    view: function() {
        return m("div", { class: "ui wide container", style: "margin-left: 20px; margin-right: 20px" },
            m("div", { class: "ui padded grid" },
                m("div", { class: "row" }, m("div", { class: "column" },
                    m("h4", { class: "ui horizontal divider header" }, 
                        m("i", { class: "ui lightbulb icon" }, ""),
                        "Automation Processes"
                    )
                )),
                m("div", { class: "row" },
                    m("table", { class: "ui compact celled striped table" },
                        m("thead",
                            m("tr", { class: "center aligned" },
                                m("th", { class: "one wide" }, "Enabled"),
                                m("th", { class: "one wide" }, "Settings"),
                                m("th", { class: "one wide" }, ""),
                                m("th", { class: "two wide" }, "Process Name"),
                                m("th", { class: "one wide" }, "Status"),
                                m("th", { class: "one wide" }, "Cycle Time"),
                                m("th", { class: "one wide" }, "Cycle Count"),
                                m("th", { class: "" }, "Last Cycle Dttm"),
                                m("th", { class: "two wide" }, "Since Last")
                            )
                        ),
                        m("tbody",
                            items["processes"].map(function(process) {
                                return m("tr",
                                    m("td", { class: "center aligned" }, ToggleProcessButton(process)),
                                    m("td", { class: "center aligned" }, ProcessSettingsButton(process)),
                                    m("td", { class: "center aligned" }, ProcessStatusIndicator(process)),
                                    m("td", { class: "left aligned" }, process.name),
                                    m("td", { class: "center aligned" }, process.status),
                                    m("td", { class: "right aligned" }, process.cycle_time),
                                    m("td", { class: "right aligned" }, process.cycles_completed),
                                    m("td", { class: "center aligned" }, formatDttm(process.last_cycle_dttm)),
                                    m("td", { class: "center aligned" }, sinceLastProcessCycle(process))
                                );
                            })
                        )
                    )
                )
            )
        );
    }
};



const TaskGroupTable = {
    intervalId: null,
    groupName: ItemGroup.TASKS,

    oninit: function() {
        startFetchingByGroup(TaskGroupTable);
    },
    view: function() {
        return m("div", { class: "ui wide container", style: "margin-left: 20px; margin-right: 20px" }, 
            m("div", { class: "ui padded grid" },
                itemGroupDivider("Automation Tasks", "wrench"),
                m("div", { class: "row" },
                    m("table", { class: "ui compact celled striped table"},
                        m("thead",
                            m("tr", { class: "center aligned" },
                                m("th", { class: "one wide" }, "Run Task"),
                                m("th", { class: "one wide" }, "Settings"),
                                m("th", { class: "one wide" }, ""),
                                m("th", { class: "two wide" }, "Task Name"),
                                m("th", { class: "one wide" }, "Status"),
                                m("th", { class: "one wide" }, "Duration"),
                                // m("th", { class: "" }, "Task Id"),
                                m("th", { class: "" }, "Start Dttm"),
                                m("th", { class: "" }, "Finish Dttm"),
                                m("th", { class: "two wide" }, "Since Last")
                            )
                        ),
                        m("tbody",
                            items["tasks"].map(function(task) {
                                return m("tr",
                                    m("td", { class: "center aligned" }, RunTaskButton(task)),
                                    m("td", { class: "center aligned" }, TaskSettingsButton(task)),
                                    m("td", { class: "center aligned" }, TaskStatusIndicator(task)),
                                    m("td", task.name),
                                    m("td", task.status),
                                    m("td", task.duration),
                                    // m("td", task.id),
                                    m("td", formatDttm(task.start_dttm)),
                                    m("td", formatDttm(task.finish_dttm)),
                                    m("td", { class: "center aligned" }, sinceLastTask(task))
                                );
                            })
                        )
                    )
                )
            )
        );
    }
};

const itemGroups = [ProcessGroupTable, TaskGroupTable];

const App = {

    toggleFetching: () => {
        // if refresh state is auto or manual change to off
        // else change to auto
        if (refreshState === RefreshState.AUTO || refreshState === RefreshState.MANUAL) {
            refreshState = RefreshState.OFF;
            itemGroups.map(group => stopFetchingByGroup(group)) 
        } else {
            refreshState = RefreshState.AUTO;
            itemGroups.map(group => startFetchingByGroup(group))
        }

    },
    stopFetching: () => {
        itemGroups.map(group => stopFetchingByGroup(group))
        refreshState = RefreshState.OFF; 
    },
    startFetching: () => {
        itemGroups.map(group => startFetchingByGroup(group))
        refreshState = RefreshState.AUTO;
    },

    view: function() {
        // return m("div", {id: "app", class: "container stretch page blurring dimmable" },
        
        return m("div", {id: "app", class: "container stretch overlay page dimmable" },
            [
                m(Header),
                itemGroups.map(group => m(group)),
        ]
        );
    }
};

m.mount(document.getElementById('automatorApp'), App);
