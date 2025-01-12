// Required if API is served by a different web server than the ui
import { AppModel } from "/web/static/js/models/app_models.js";
import { AppViews } from "/web/static/js/views/app_views.js";

var app = app || {};
app.model = new AppModel();


app.view = new AppViews(app.model);

const App = {
    oninit: () => { app.model.startFetching() },

    view: () => {
        return m("div", { id: "app", class: "ui fluid container" },
            [
                m(app.view.Header, {}, ""),
                m(app.view.ProcessGroupTable, { model: app.model }),
                m(app.view.TaskGroupTable, { model: app.model } , ""),
            ]
        );
    }
};

m.mount(document.getElementById('automatorApp'), App);
