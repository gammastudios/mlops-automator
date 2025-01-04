from contextlib import asynccontextmanager
from fastapi import FastAPI

from mlops_automator.api_service.automation_services.automation_task  import AutomationTask
from mlops_automator.api_service.automation_services.automation_process import AutomationProcess

from mlops_automator.api_service.routers.process_router import pr as process_router
from mlops_automator.api_service.routers.task_router import tr as task_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    processes = [
        AutomationProcess(name="process1", cycle_time=5),
        AutomationProcess(name="process2", cycle_time=15),
    ]
    app.state.processes = processes

    tasks = [
        AutomationTask(name="task1"),
        AutomationTask(name="task2")
    ]
    app.state.tasks = tasks
    yield
    # any required cleanup code goes here


app = FastAPI(lifespan=lifespan)

app.include_router(process_router)
app.include_router(task_router)


# if __name__ == "__main__":
#     import uvicorn
#     uvicorn.run(app)