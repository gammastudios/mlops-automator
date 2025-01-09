// Required if API is served by a different web server than the ui
// const API_URL = "http://localhost:8000";
import { DateTime } from "/web/static/js/luxon.js";
import { app, ProcessModel, TaskModel, ItemGroup, RefreshState } from "/web/static/js/models/app.models.js";


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
    if (task.status !== TaskModel.TaskStatus.FINISHED) {
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


// -----------------------------
// UI components

// refresh control menu buttons
const RefreshButton = {
    // ensures a short animation of the refresh button for user feedback
    animationDelay: 500,
    // https://mithril-by-examples.js.org/examples/loading-button-component/
    view: (v) =>
        m("button", {
                class: app.model.refreshStateIsManual() ? "ui active button" : "ui button",
                onclick: () => {
                    let prevRefreshState = app.model.getRefreshState();
                    app.model.setRefreshState(RefreshState.MANUAL);
                    m.redraw();
                    // ensures a 1/2 second delay before reverting to previous refresh state
                    const startTime = Date.now();
                    app.model.refreshAllItems().then((response) => {
                        const elapsedTime = Date.now() - startTime;
                        const remainingTime = RefreshButton.animationDelay - elapsedTime;
                        if (remainingTime > 0) {
                            setTimeout(() => {
                                app.model.setRefreshState(prevRefreshState);
                                m.redraw();
                            }, remainingTime);
                        } else {
                            app.model.setRefreshState(prevRefreshState);
                            m.redraw();
                        }
                    })
                }
            },
            m("i", { class: app.model.refreshStateIsManual() ? "ui loading refresh icon": "ui refresh icon" }, "")
        )
};


const PlayButton = {
    view: (v) =>
        m("button", { 
            class: app.model.refreshStateIsAuto() ? "ui active button" : "ui button", 
            onclick: App.startFetching },
        m("i", { class: "ui play icon" }, "")
    )
};


const PauseButton = {
    view : (v) =>
        m("button", {
            class: app.model.refreshStateIsOff() ? "ui active button" : "ui button",
            onclick: App.stopFetching
        },
        m("i", { class: "ui pause icon"})
    )
};


const StatusButton = {
    view: (v) =>
        m("div", { 
            class: app.model.isRefreshing() ? "small ui active green button" :
                    "small ui active grey button",
                onclick: App.toggleFetching,
                style: "width: 150px"
            },
            app.model.refreshStateIsAuto() ? "Monitoring" : 
                app.model.refreshStateIsOff() ? "Paused" : "Refreshing"
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

// control dimmer behaviour
var dimmerEnabled = false;
const enableDimmer = () => {
    dimmerEnabled = true;
    $('.dimmable').dimmer({closable: false});
    $('.dimmable').dimmer('show');
};

const disableDimmer = () => {
    dimmerEnabled = false;
    $('.dimmable').dimmer('hide');
}

const ItemGroupDivider = (groupLabel, groupIcon) => {
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
                checked: process.status === ProcessModel.ProcessStatus.RUNNING,
                onclick: (event) => {
                    app.model.prevProcessStatus[process.name] = process.status;
                    ProcessModel.toggleProcessItem(process);  
                },
                disabled: app.model.prevProcessStatus[process.name] !== undefined
            }),
            m("label", "", "")
    );
};


const RunTaskButton = (task) => {
    return m("div", {class: ""}, [
        m("button", {
                class: task.status === TaskModel.TaskStatus.RUNNING ? "ui green small labeled icon button" : "ui small labeled icon button",
                style: "width: 120px",
                onclick: () => {
                    app.model.prevTaskId[task.name] = task.id;
                    TaskModel.startTask(task)
                },
                disabled: (app.model.prevTaskId[task.name] !== undefined
                      || app.model.prevTaskId[task.name] === task.id 
                      || task.status === TaskModel.TaskStatus.RUNNING
                    ),
            },
            m("i", { 
                class: task.status === TaskModel.TaskStatus.RUNNING ? "ui loading spinner icon" : "ui play icon"
            }, ""),
            m("span", { class: "" }, 
                task.status === TaskModel.TaskStatus.RUNNING ? "Running" : "Start"
            )
        ),
    ]);
};


const ProcessStatusIndicator = (process) => {
    return m("i", { 
        class: app.model.prevProcessStatus[process.name] !== undefined ? "ui grey loading spinner icon" : 
               process.status === ProcessModel.ProcessStatus.RUNNING ? "ui teal chevron circle right icon" : 
               process.status === ProcessModel.ProcessStatus.STOPPED ? "ui red stop circle outline icon" : "ui yellow question circle icon"
    }, "");
};


const TaskStatusIndicator = (task) => {
    return m("i", {
        class: (app.model.prevTaskId[task.name] !== undefined || app.model.prevTaskId[task.name] === task.id) ? "ui loading spinner icon" :
            task.status === TaskModel.TaskStatus.RUNNING ? "ui loading spinner icon" :
            task.status === TaskModel.TaskStatus.FINISHED ? "ui green check icon" : "ui yellow question circle icon"
    }, "");
};

// TODO - make this dynamic so as to not be dependent on the actual process names managed by the API svc
var showProcessSettingsModal = { process1: false, process2: false }; ;
var showTaskSettingsModal = { task1: false, task2: false };

const ProcessSettingsButton = (process) => {
    return m("div", {} ,
            m("button", { 
                    class: "ui small icon button",
                    type: "button",
                    onclick: () => { 
                        enableDimmer();
                        showProcessSettingsModal[process.name] = true;
                        console.log("settings button clicked: " + process.name);
                    },
                },
                m("i", { class: "ui settings icon" }, "")),
            showProcessSettingsModal[process.name] && m(ProcessSettingsModal, { processName: process.name }, "")
    );
};

const TaskSettingsButton = (task) => {
    return m("div", {},
        m("button", {
                class: "ui small icon button",
                type: "button",
                onclick: () => {
                    enableDimmer();
                    showTaskSettingsModal[task.name] = true;
                    console.log("settings button clicked: " + task.name);
                },
    },
            m("i", { class: "ui settings icon" }, "")),
        showTaskSettingsModal[task.name] && m(TaskSettingsModal, { taskName: task.name }, "")
    );
};


/**
 * NumericField Component
 * 
 * A generic numeric input field component with optional units label.
 * This component is designed to be reusable and can be used in various forms
 * where numeric input is required.
 * 
 * Supported Attributes:
 * - id: The id of the input field (string)
 * - value: The initial value of the input field (number)
 * - label: The text label for the input field (string)
 * - units: Optional units label to display next to the input field (string)
 */
const NumericField = {
    oninit: (vnode) => {
        vnode.state.value = vnode.attrs.value || 0;
    },
    view: (vnode) => {
        return m("div", { class: "inline field" },
            m("label", { for: vnode.attrs.id }, vnode.attrs.label || "Undefined"),
            // optional unit label div wrapper - noop if no units provided
            m("div", { class: vnode.attrs.units ? "ui right labeled input" : "ui input" },
                m("input", {
                    type: "text",
                    class: "right aligned",
                    id: vnode.attrs.id,
                    value: vnode.state.value,
                    oninput: (e) => {
                        vnode.state.value = e.target.value;
                        if (vnode.attrs.onchange) {
                            vnode.attrs.onchange(e.target.value);
                        }
                    }
                }),
                // optional units label
                vnode.attrs.units ? m("div", { class: "ui basic label" }, vnode.attrs.units) : ""
            )
        );
    }
};


const TaskSettingsForm = {
    oninit: (v) => {
        v.state.task = app.model.items["tasks"].find(t => t.name === v.attrs.taskName);
        v.state.formData = {
            duration: v.state.task.duration
        }
    },
    view: (v) => {
        return m("form", { 
                id: "f-t-settings",
                class: "ui form",
                onsubmit: (e) => {
                    e.preventDefault();
                    console.log('TASK onsubmit form handler called');
                    TaskModel.updateTaskItem(v.state.task, v.state.formData)
                        .then(() => {
                            app.model.refreshAllItems();
                            console.log("TASK update submitted")
                        })
                        .catch((error) => {
                            console.error("Error updating task", error.response);
                            $.toast({
                                position: "bottom attached",
                                title: "ERROR",
                                class: "error",
                                message: error.response.detail.map(d => d.msg).join(", "),
                                showProgress: "bottom",
                            })
                        }
                    );
                }
        },
            m("div", { class: "fields" },
                m(NumericField, { 
                    id: "duration",
                    label: "Duration",
                    units: "sec",
                    value: v.state.formData.duration,
                    onchange: (value) => { 
                        v.state.formData.duration = value;
                    }
                }),
            ),
        ) 
    }
};


const ProcessSettingsForm = {
    oninit: (v) => {
        // vnode.state.processName = vnode.attrs.processName;
        v.state.process = app.model.items["processes"].find(p => p.name === v.attrs.processName);
        v.state.formData = {
            cycle_time: v.state.process.cycle_time
        }
    },

    view: (v) => {
        return m("form", { 
                id: "f-p-settings",
                class: "ui form",
                onsubmit: (e) => {
                    e.preventDefault();
                    console.log('onsubmit form handler called');
                    ProcessModel.updateProcessItem(v.state.process, v.state.formData)
                        .then(() => {
                            app.model.refreshAllItems();
                            console.log("process updated submitted")
                        })
                        .catch((error) => {
                            console.error("Error updating process: ", error.response);
                            $.toast({
                                position: "bottom attached",
                                title: "ERROR",
                                class: "error",
                                message: error.response.detail.map(d => d.msg).join(", "),
                                showProgress: "bottom",
                            })
                        });
                }
        },
            m("div", { class: "fields" },
                m(NumericField, { 
                    id: "cycle-time",
                    label: "Cycle Time",
                    units: "sec",
                    value: v.state.formData.cycle_time,
                    onchange: (value) => { 
                        v.state.formData.cycle_time = value; // Update the process state with the new value
                    }
                }),
            ),
        ) 
    }
};


const ProcessSettingsModal = { 
    view: (v) => [
        m("modal", { class: "ui overlay modal active", },
            m('div', { class: "header" }, 'Update Process Settings: ' + v.attrs.processName),
            m('div', { class: "content" }, m(ProcessSettingsForm, { processName: v.attrs.processName }, "")),
            m("div", { class: "actions" },
                m('button', {
                    class: "ui positive button",
                    type: "submit",
                    form: "f-p-settings",
                    onclick: (e) => {
                        disableDimmer();
                        showProcessSettingsModal[v.attrs.processName] = false;
                        console.log("save button clicked: " + v.attrs.processName);
                    }
                }, 'Apply'),
                m('button', { 
                    class: "ui negative button",
                    onclick: () => { 
                        disableDimmer();
                        showProcessSettingsModal[v.attrs.processName] = false;
                        console.log("cancel button clicked: " + v.attrs.processName);
                    }
                }, 'Cancel')
            )
        )
    ]
}

const TaskSettingsModal = {
    view: (v) => [
        m("modal", { class: "ui overaly modal active", },
            m("div", { class: "header" }, "Update Task Settings: " + v.attrs.taskName),
            m("div", { class: "content" }, m(TaskSettingsForm, { taskName: v.attrs.taskName }, "")),
            m("div", { class: "actions" },
                m("button", {
                    class: "ui positive button",
                    type: "submit",
                    form: "f-t-settings",
                    onclick: (e) => {
                        disableDimmer();
                        showTaskSettingsModal[v.attrs.taskName] = false;
                        console.log("save button clicked: " + v.attrs.taskName);
                    }
                }, "Apply"),
                m("button", {
                    class: "ui negative button",
                    onclick: () => {
                        disableDimmer();
                        showTaskSettingsModal[v.attrs.taskName] = false;
                        console.log("cancel button clicked: " + v.attrs.taskName);
                    }
                }, "Cancel")
            )
        )
    ]
};


const ProcessGroupTable = {
    intervalId: null,
    groupName: ItemGroup.GroupKey.PROCESSES,

    oninit: function() {
        app.model.startFetchingByGroup(ProcessGroupTable);
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
                            app.model.items["processes"].map(function(process) {
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
    groupName: ItemGroup.GroupKey.TASKS,

    oninit: function() {
        app.model.startFetchingByGroup(TaskGroupTable);
    },
    view: function() {
        return m("div", { class: "ui wide container", style: "margin-left: 20px; margin-right: 20px" }, 
            m("div", { class: "ui padded grid" },
                ItemGroupDivider("Automation Tasks", "wrench"),
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
                            app.model.items["tasks"].map(function(task) {
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

const itemGroupTables = [ProcessGroupTable, TaskGroupTable];

const App = {

    toggleFetching: () => {
        // if refresh state is auto or manual change to off
        // else change to auto
        if (app.model.isRefreshing()) {
            app.model.setRefreshState(RefreshState.OFF);
            itemGroupTables.map(group => app.model.stopFetchingByGroup(group)) 
        } else {
            app.model.setRefreshState(RefreshState.AUTO);
            itemGroupTables.map(group => app.model.startFetchingByGroup(group))
        }

    },
    stopFetching: () => {
        itemGroupTables.map(group => app.model.stopFetchingByGroup(group))
        app.model.setRefreshState(RefreshState.OFF); 
    },
    startFetching: () => {
        itemGroupTables.map(group => app.model.startFetchingByGroup(group))
        app.model.setRefreshState(RefreshState.AUTO);
    },

    view: function() {
        // return m("div", {id: "app", class: "container stretch page blurring dimmable" },
        
        return m("div", { id: "app", class: "ui fluid container" },
            [
                m(Header),
                itemGroupTables.map(group => m(group)),
            ]
        );
    }
};

m.mount(document.getElementById('automatorApp'), App);
