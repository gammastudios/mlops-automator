const API_URL = "http://localhost:8000";

const Header = {
   view: function() {
        return m("div", {id: "header"}, 
            m("header", 
                m("h1", "MLOps Automator"),
                m("button", { onclick: App.toggleFetching }, App.isFetching ? "Pause Refresh" : "Enable Refresh")
            )
        ); 
    }
};

// app data
var items = {
    processes: [],
    tasks: []
};

// refresh rate in milliseconds
var refreshRate = 5000;

// refresh a set of items from the API service
const refreshItems = (itemSet) => {
    m.request({
        method: "GET",
        url: "/" + itemSet
    })
    .then(data => {
        items[itemSet] = data[itemSet];
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

const ProcessList = {
    intervalId: null,
    groupName: 'processes',

    oninit: function() {
        startFetchingByGroup(ProcessList);
    },
    view: function() {
        return m("div", 
            m("div", { class: "item-group-heading" },
                m("h2", "Processes")
            ),
            m("table", 
                m("thead",
                    m("tr",
                        m("th", "Name"),
                        m("th", "Status")
                    )
                ),
                m("tbody",
                    items["processes"].map(function(process) {
                        return m("tr",
                            m("td", process.name),
                            m("td", process.status)
                        );
                    })
                )
            )
        );
    }
};

const TaskList = {
    intervalId: null,
    groupName: 'tasks',

    oninit: function() {
        startFetchingByGroup(TaskList);
    },
    view: function() {
        return m("div", 
            m("div", { class: "item-group-heading" },
                m("h2", "Tasks")
            ),
            m("table", 
                m("thead",
                    m("tr",
                        m("th", "Name"),
                        m("th", "Status")
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
        );
    }
};

const itemGroups = [ProcessList, TaskList];

const App = {
    isFetching: true,
    
    toggleFetching: function() {
        App.isFetching ? itemGroups.map(group => stopFetchingByGroup(group)) : itemGroups.map(group => startFetchingByGroup(group));
        App.isFetching = !App.isFetching;
    },
    view: function() {
        return m("div", {id: "app"},
            [
                m(Header),
                itemGroups.map(group => m(group)),
        ]
        );
    }
};

m.mount(document.getElementById('automatorApp'), App);
