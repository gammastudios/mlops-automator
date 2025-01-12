import { DateTime } from "/web/static/js/luxon.js";


export const formatDttm = (dttmStr, defaultLowDttmStr="-") => {
    // timestamp formatter, with special handling for low dttm values
    let trgtDttm = DateTime.fromISO(dttmStr);
    let lowDttm = DateTime.fromISO('1900-01-01T00:00:00+00:00');

    if (trgtDttm.toMillis() == lowDttm.toMillis()) {
        return defaultLowDttmStr;
    } else {
        return trgtDttm.toISO();
    }
};


export const sinceLastProcessCycle = (lastCycleDttm, defaultNoCycleStr="-") => {
    let trgtDttm = DateTime.fromISO(lastCycleDttm);
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

export const sinceLastTask = (task, defaultNoDurationStr="-") => {
    // based on status and start/finish times, provide a string representation of the duration since last finish
    if (task.isRunning() || task.isInitial()) {
        return defaultNoDurationStr;
    } else {
        return DateTime.fromISO(task.taskFinishDttm)
            .toRelative({
                style: "short", 
                locale: "en", 
                units: ["days", "hours", "minutes", "seconds"] 
            })
    }
};

export class AppViews {
    constructor(model) {
        this.model = model

        // used to control display of process and task settings modal forms
        this.showProcessSettingsModal = { }; ;
        this.showTaskSettingsModal = { };

        this.dimmerEnabled = false;
    }


    PlayButton = () => { return {
            view: (v) => {
                return m("button", { 
                        class: this.model.refreshStateIsAuto() ? "ui active button" : "ui button",
                        onclick: () => { this.model.startFetching() }
                    },
                    m("i", { class: "ui play icon" }, "")
                )
            }
    }}

    PauseButton = () => { return {
            view : (v) => {
                return m("button", {
                        class: this.model.refreshStateIsOff() ? "ui active button" : "ui button",
                        onclick: () => { this.model.stopFetching() }
                    },
                    m("i", { class: "ui pause icon"})
                )
            }
    }}

    RefreshButton = () => {
        // 1/2 second animation delay
        const animationDelay = 500;
        return {
            // ensures a short animation of the refresh button for user feedback
            // https://mithril-by-examples.js.org/examples/loading-button-component/
            view: (v) => {
                return m("button", {
                        class: this.model.refreshStateIsManual() ? "ui active button" : "ui button",
                        onclick: () => {
                            let prevRefreshState = this.model.getRefreshState();
                            this.model.setRefreshStateToManual();
                            // ensures animation delay before reverting to previous refresh state
                            const startTime = Date.now();
                            this.model.refreshAllItems().then((response) => {
                                const elapsedTime = Date.now() - startTime;
                                const remainingTime = animationDelay - elapsedTime;
                                if (remainingTime > 0) {
                                    setTimeout(() => {
                                        this.model.setRefreshState(prevRefreshState);
                                        m.redraw();
                                    }, remainingTime);
                                } else {
                                    this.model.setRefreshState(prevRefreshState);
                                    m.redraw();
                                }
                            })
                        }
                    },
                    m("i", { class: this.model.refreshStateIsManual() ? "ui loading refresh icon": "ui refresh icon" }, "")
                )
        }
    }}

    StatusButton = () => { return {
            view: (v) => {
                return m("div", { 
                    class: this.model.isRefreshing() ? "small ui active green button" :
                            "small ui active grey button",
                        onclick: () => {
                            this.model.toggleRefreshState();
                        },
                        style: "width: 150px"
                    },
                    this.model.refreshStateIsAuto() ? "Monitoring" : 
                        this.model.refreshStateIsOff() ? "Paused" : "Refreshing"
            )
        }
    }}


    Header = () => { return {
        view: (v) => {
             return m("div", { class: "ui inverted menu grey"},
                 m("div", { class: "ui fluid container" }, 
                     m("div", { class: "header item" }, "MLOps-Omator"),
                     m("div", { class: "right item" },
                         m("div", { class: "ui horizontal icon buttons" }, [
                             m(this.RefreshButton, {}, ""),
                             m(this.PlayButton, {}, ""),
                             m(this.PauseButton, {}, ""),
                             m(this.StatusButton, {}, "")
                         ])
                     )
                 )
             );
         }
     }}
   

    ToggleProcessButton = () => { return {
        view: (v) => {
            return m("div", { class: "ui toggle checkbox" }, 
                m("input", {
                    type: "checkbox", 
                    checked: v.attrs.process.isRunning(),
                    onclick: () => { v.attrs.process.toggleStatus(); },
                    disabled: v.attrs.process.isUpdatingStatus()
                }),
                m("label", "", "")
            );
        }
    }}


    RunTaskButton = () => { return {
        view: (v) => {
            return m("div", {class: ""}, [
                m("button", {
                            class: v.attrs.task.isRunning() ? "ui green small labeled icon button" : "ui small labeled icon button",
                            style: "width: 120px",
                            onclick: () => { v.attrs.task.startTaskInstance() },
                            disabled: v.attrs.task.isStartingTaskInstance() || v.attrs.task.isRunning()
                    },
                    m("i", { 
                        class: v.attrs.task.isRunning() ? "ui loading spinner icon" : "ui play icon"
                    }, ""),
                    m("span", { class: "" }, 
                        v.attrs.task.isRunning() ? "Running" : "Start"
                    )
                ),
            ]);
        }
    }}


    
    ProcessStatusIndicator = () => { return {
        view: (v) => {
            return m("i", { 
                    class: v.attrs.process.isUpdatingStatus() ? "ui grey loading spinner icon" : 
                        v.attrs.process.isRunning() ? "ui teal chevron circle right icon" : 
                        v.attrs.process.isStopped() ? "ui red stop circle outline icon" : "ui yellow question circle icon"
            }, "");
        }
    }}
    
    
    TaskStatusIndicator = () => { return {
        view: (v) => {
            return m("i", {
                    class: (v.attrs.task.isStartingTaskInstance()) ? "ui loading spinner icon" :
                        v.attrs.task.isRunning() ? "ui loading spinner icon" :
                        v.attrs.task.isFinished() ? "ui green check icon" : "ui yellow question circle icon"
            }, "");
        }
    }}

    // control dimmer behaviour
    enableDimmer = () => {
        this.dimmerEnabled = true;
        $('.dimmable').dimmer({closable: false});
        $('.dimmable').dimmer('show');
    };

    disableDimmer = () => {
        this.dimmerEnabled = false;
        $('.dimmable').dimmer('hide');
    }

    ProcessSettingsButton = () => { return {
        view: (v) => {
            return m("div", {} ,
                m("button", { 
                        class: "ui small icon button",
                        type: "button",
                        onclick: () => { 
                            this.enableDimmer();
                            this.showProcessSettingsModal[v.attrs.process.processName] = true;
                            console.log("settings button clicked: " + v.attrs.process.processName);
                        },
                    },
                    m("i", { class: "ui settings icon" }, "")),
                this.showProcessSettingsModal[v.attrs.process.processName] && m(this.ProcessSettingsModal, { processName: v.attrs.process.processName }, "")
            );
        }
    }}

    
    TaskSettingsButton = () => { return {
        view: (v) => {
            return m("div", {},
                m("button", {
                        class: "ui small icon button",
                        type: "button",
                        onclick: () => {
                            this.enableDimmer();
                            this.showTaskSettingsModal[v.attrs.task.taskName] = true;
                            console.log("settings button clicked: " + v.attrs.task.taskName);
                        },
                    },
                    m("i", { class: "ui settings icon" }, "")),
                this.showTaskSettingsModal[v.attrs.task.taskName] && m(this.TaskSettingsModal, { taskName: v.attrs.task.taskName }, "")
            );
        }
    }}


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
    NumericField = () => { return {
        oninit: (v) => {
            v.state.value = v.attrs.value || 0;
        },
        view: (v) => {
            return m("div", { class: "inline field" },
                m("label", { for: v.attrs.id }, v.attrs.label || "Undefined"),
                // optional unit label div wrapper - noop if no units provided
                m("div", { class: v.attrs.units ? "ui right labeled input" : "ui input" },
                    m("input", {
                        type: "text",
                        class: "right aligned",
                        id: v.attrs.id,
                        value: v.state.value,
                        oninput: (e) => {
                            v.state.value = e.target.value;
                            if (v.attrs.onchange) {
                                v.attrs.onchange(e.target.value);
                            }
                        }
                    }),
                    // optional units label
                    v.attrs.units ? m("div", { class: "ui basic label" }, v.attrs.units) : ""
                )
            );
        }
    }}


    // attrs
    // processName
    ProcessSettingsForm = () => { return {
        oninit: (v) => {
            v.state.process = this.model.itemGroups["processes"].items.find(p => p.processName === v.attrs.processName);
            v.state.formData = {
                cycleTime: v.state.process.cycleTime
            }
        },
        view: (v) => {
            return m("form", { 
                        id: "f-p-settings",
                        class: "ui form",
                        onsubmit: (e) => {
                            e.preventDefault();
                            console.log('PROCESS onsubmit form handler called');
                            v.state.process.update(v.state.formData)
                                .then(() => {
                                    this.model.refreshAllItems();
                                    console.log("PROCESS update submitted")
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
                    m(this.NumericField, { 
                        id: "cycle-time",
                        label: "Cycle Time",
                        units: "sec",
                        value: v.state.formData.cycleTime,
                        onchange: (value) => { 
                            v.state.formData.cycleTime = value; // Update the process state with the new value
                        }
                    }),
                )
            );
        }
    }}

    // taskName
    TaskSettingsForm = () => { return {
        oninit: (v) => {
            v.state.task = this.model.itemGroups["tasks"].items.find(t => t.taskName === v.attrs.taskName);
            v.state.formData = {
                taskDuration: v.state.task.taskDuration
            }
        },
        view: (v) => {
            return m("form", { 
                    id: "f-t-settings",
                    class: "ui form",
                    onsubmit: (e) => {
                        e.preventDefault();
                        console.log('TASK onsubmit form handler called');
                        v.state.task.update(v.state.formData)
                            .then(() => {
                                this.model.refreshAllItems();
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
                    m(this.NumericField, { 
                        id: "duration",
                        label: "Duration",
                        units: "sec",
                        value: v.state.formData.taskDuration,
                        onchange: (value) => { 
                            v.state.formData.taskDuration = value;
                        }
                    }),
                ),
            ) 
        }
    }}


    // processName
    ProcessSettingsModal = () => { return { 
        view: (v) => [
            m("modal", { class: "ui overlay modal active", },
                m('div', { class: "header" }, 'Update Process Settings: ' + v.attrs.processName),
                m('div', { class: "content" }, m(this.ProcessSettingsForm, { processName: v.attrs.processName }, "")),
                m("div", { class: "actions" },
                    m('button', {
                        class: "ui positive button",
                        type: "submit",
                        form: "f-p-settings",
                        onclick: (e) => {
                            this.disableDimmer();
                            this.showProcessSettingsModal[v.attrs.processName] = false;
                            console.log("save button clicked: " + v.attrs.processName);
                        }
                    }, 'Apply'),
                    m('button', { 
                        class: "ui negative button",
                        onclick: () => { 
                            this.disableDimmer();
                            this.showProcessSettingsModal[v.attrs.processName] = false;
                            console.log("cancel button clicked: " + v.attrs.processName);
                        }
                    }, 'Cancel')
                )
            )
        ]
    }}

    // taskName
    TaskSettingsModal = () => { return {
        view: (v) => [
            m("modal", { class: "ui overaly modal active", },
                m("div", { class: "header" }, "Update Task Settings: " + v.attrs.taskName),
                m("div", { class: "content" }, m(this.TaskSettingsForm, { taskName: v.attrs.taskName }, "")),
                m("div", { class: "actions" },
                    m("button", {
                        class: "ui positive button",
                        type: "submit",
                        form: "f-t-settings",
                        onclick: (e) => {
                            this.disableDimmer();
                            this.showTaskSettingsModal[v.attrs.taskName] = false;
                            console.log("save button clicked: " + v.attrs.taskName);
                        }
                    }, "Apply"),
                    m("button", {
                        class: "ui negative button",
                        onclick: () => {
                            this.disableDimmer();
                            this.showTaskSettingsModal[v.attrs.taskName] = false;
                            console.log("cancel button clicked: " + v.attrs.taskName);
                        }
                    }, "Cancel")
                )
            )
        ]
    }}


    ItemGroupDivider(groupLabel, groupIcon) {
        return m(
            "div", { class: "row" },
                m("div", { class: "column" },
                    m("h4", { class: "ui horizontal divider header" }, 
                    m("i", { class: "ui " + groupIcon + " icon" }, ""),
                    groupLabel
                ))
        )
    }


    ProcessGroupTable = () => { return {
        view: (v) => {
            return m("div", { class: "ui wide container", style: "margin-left: 20px; margin-right: 20px" },
                m("div", { class: "ui padded grid" },
                    this.ItemGroupDivider("Automation Processes", "lightbulb"),
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
                                // this.model.items["processes"].map((process) => {
                                this.model.itemGroups["processes"].items.map((process) => {
                                    return m("tr",
                                        m("td", { class: "center aligned" }, m(this.ToggleProcessButton, { process: process})),
                                        m("td", { class: "center aligned" }, m(this.ProcessSettingsButton, { process: process })),
                                        m("td", { class: "center aligned" }, m(this.ProcessStatusIndicator, { process: process})),
                                        m("td", { class: "left aligned" }, process.processName),
                                        m("td", { class: "center aligned" }, process.processStatus),
                                        m("td", { class: "right aligned" }, process.cycleTime),
                                        m("td", { class: "right aligned" }, process.cycleCount),
                                        m("td", { class: "center aligned" }, formatDttm(process.lastCycleDttm)),
                                        m("td", { class: "center aligned" }, sinceLastProcessCycle(process.lastCycleDttm))
                                    );
                                })
                            )
                        )
                    )
                )
            );
        }
    }}


    TaskGroupTable = () => { return {
        view: (v) => {
            return m("div", { class: "ui wide container", style: "margin-left: 20px; margin-right: 20px" }, 
                m("div", { class: "ui padded grid" },
                    this.ItemGroupDivider("Automation Tasks", "wrench"),
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
                                this.model.itemGroups["tasks"].items.map((task) => {
                                    return m("tr",
                                        m("td", { class: "center aligned" }, m(this.RunTaskButton, { task: task})),
                                        m("td", { class: "center aligned" }, m(this.TaskSettingsButton, { task: task })),
                                        m("td", { class: "center aligned" }, m(this.TaskStatusIndicator, { task: task})),
                                        m("td", task.taskName),
                                        m("td", task.taskStatus),
                                        m("td", task.taskDuration),
                                        // m("td", task.taskId),
                                        m("td", formatDttm(task.taskStartDttm)),
                                        m("td", formatDttm(task.taskFinishDttm)),
                                        m("td", { class: "center aligned" }, sinceLastTask(task))
                                    );
                                })
                            )
                        )
                    )
                )
            );
        }
    }}

};
