// Required if API is served by a different web server than the ui
// const API_URL = "http://localhost:8000";

// app data
var items = {
    processes: [],
    tasks: []
};

// refresh rate in milliseconds
var refreshRate = 5000;

const Header = {
   view: function() {
        return m("div", { class: "ui inverted menu grey"},
            m("div", { class: "ui fluid container" }, 
                m("div", { class: "header item" }, "MLOps-omator"),
                m("div", { class: "right item" },
                    m("button", { 
                        onclick: App.toggleFetching,
                        class: App.isFetching ? "small ui green button" : "small ui light-grey button",
                        style: "width: 200px"
                        }, App.isFetching ? "Monitoring" : "Paused"
                    )
                )
            )
        );
    }
};


const toggleProcessItem = (process) => {
    // Sends an API request to toggle the state of a process item
    m.request({
        method: "PATCH",
        url: "/process/" + process.name,
        body: { status: process.status === "running" ? "stopped" : "running" }
    })
    .catch(error => {
    });

};


// refresh a set of items from the API service
const refreshItems = (itemSet) => {
    m.request({
        method: "GET",
        url: "/" + itemSet
    })
    .then(data => {
        items[itemSet] = data[itemSet];
        if (itemSet === "processes") {
            items[itemSet].forEach(process => {
                // if there is a previous status that is different from latest status remove the update flag
                if (prevProcessStatus[process.name] !== undefined) {
                    if (prevProcessStatus[process.name] !== process.status)
                        delete prevProcessStatus[process.name];
                }
            });
        }
    })
    .catch(error => {
        console.error("Error fetching " + itemSet + ":", error);
    });
};

const startFetchingByGroup = (itemGroup) => {
    refreshItems(itemGroup.groupName);
    if (itemGroup.intervalId === null) {
        itemGroup.intervalId = setInterval(refreshItems, refreshRate, itemGroup.groupName);
    }
};

const stopFetchingByGroup = (itemGroup) => {
    if (itemGroup.intervalId) {
        clearInterval(itemGroup.intervalId);
        itemGroup.intervalId = null;
    }
};

// UI components

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

var prevProcessStatus = {};
const ProcessToggleButton = (process) => {
    return m(
        "div", { class: "ui toggle checkbox" }, 
            m("input", {
                type: "checkbox", 
                checked: process.status === "running",
                onclick: (event) => {
                    prevProcessStatus[process.name] = process.status;
                    toggleProcessItem(process);  
                },
                disabled: prevProcessStatus[process.name] !== undefined
            }),
            m("label", "",
                m("i", { 
                    class: prevProcessStatus[process.name] !== undefined ? "ui grey loading spinner icon" : 
                           process.status === "running" ? "ui teal chevron circle right icon" : 
                           process.status === "stopped" ? "ui red stop circle outline icon" : "ui yellow question circle icon"
                }, "")
            )
    );
};

const ProcessGroup = {
    intervalId: null,
    groupName: 'processes',

    oninit: function() {
        startFetchingByGroup(ProcessGroup);
    },
    view: function() {
        return m("section", { style: "margin-left: 20px; margin-right: 20px" },
            m("div", { class: "ui padded grid" },
                m("div", { class: "row" }, m("div", { class: "column" },
                    m("h4", { class: "ui horizontal divider header" }, 
                        m("i", { class: "ui lightbulb icon" }, ""),
                        "Automation Processes"
                    )
                )),
                m("div", { class: "row" },
                    m("table", { class: "ui compact striped table" },
                        m("thead",
                            m("tr",
                                m("th", { class: "one wide" }, "Enabled"),
                                m("th", { class: "two wide" }, "Process Name"),
                                m("th", { class: "" }, "Status"),
                                m("th", { class: "" }, "Cycle Time"),
                                m("th", { class: "" }, "Cycles Completed"),
                                m("th", { class: "" }, "Last Cycle Dttm")
                            )
                        ),
                        m("tbody",
                            items["processes"].map(function(process) {
                                return m("tr",
                                    m("td", { "data-label": "Enabled" }, ProcessToggleButton(process)),
                                    m("td", { "data-label": "Name" }, process.name),
                                    m("td", { "data-label": "Status" }, process.status),
                                    m("td", { "data-label": "Cycle Time" }, process.cycle_time),
                                    m("td", { "data-label": "Cycles Completed" }, process.cycles_completed),
                                    m("td", { "data-label": "Last Cycle Dttm" }, process.last_cycle_dttm),

                                );
                            })
                        )
                    )
                )
            )
        );
    }
};

const TaskGroup = {
    intervalId: null,
    groupName: 'tasks',

    oninit: function() {
        startFetchingByGroup(TaskGroup);
    },
    view: function() {
        return m("section", { style: "margin-left: 20px; margin-right: 20px" }, 
            m("div", { class: "ui padded grid" },
                itemGroupDivider("Automation Tasks", "wrench"),
                m("div", { class: "row" },
                    m("table", { class: "ui compact striped table"},
                        m("thead",
                            m("tr",
                                m("th", { class: "two wide" }, "Name"),
                                m("th", { class: "" }, "Status")
                            )
                        ),
                        m("tbody",
                            items["tasks"].map(function(task) {
                                return m("tr",
                                    m("td", task.name),
                                    m("td", task.status)
                                );
                            })
                        )
                    )
                )
            )
        );
    }
};

const itemGroups = [ProcessGroup, TaskGroup];

const App = {
    isFetching: true,
    
    toggleFetching: function() {
        App.isFetching ? itemGroups.map(group => stopFetchingByGroup(group)) : itemGroups.map(group => startFetchingByGroup(group));
        App.isFetching = !App.isFetching;

    },
    view: function() {
        return m("div", {id: "app", class: "container stretch" },
            [
                m(Header),
                itemGroups.map(group => m(group)),
        ]
        );
    }
};

m.mount(document.getElementById('automatorApp'), App);
