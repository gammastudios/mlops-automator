from fastapi import (
    APIRouter,
    HTTPException,
    Request,
)

from mlops_automator.api_service.models.task_model import (
    TaskModel,
    TaskListModel,
    TaskParamsModel,
)

from mlops_automator.api_service.automation_services.automation_task import AutomationTaskAlreadyExistsError

# create the router for process related routes
tr = APIRouter()


@tr.get("/tasks")
def get_tasks(request: Request) -> TaskListModel:
    tasks = [TaskModel.model_validate(t) for t in request.app.state.tasks]
    return TaskListModel(tasks=tasks)


@tr.get("/tasks/{task_name}")
def get_task(task_name: str, request: Request) -> TaskModel:
    for task in request.app.state.tasks:
        if task.name == task_name:
            return TaskModel.model_validate(task)
    raise HTTPException(status_code=404, detail="Task not found")


@tr.post("/tasks/{task_name}")
def create_task(task_name: str, params: TaskParamsModel, request: Request) -> TaskModel:
    for task in request.app.state.tasks:
        if task.name == task_name:
            try:
                if duration := params.duration:
                    task.duration = duration
                task.start_task()
                return  TaskModel.model_validate(task)
            except AutomationTaskAlreadyExistsError:
                raise HTTPException(status_code=409, detail=f"Task id {task.id} already running")
            
    raise HTTPException(status_code=404, detail="Task not found")


@tr.patch("/tasks/{task_name}")
def update_task_attrs(request: Request, task_name: str, params: TaskParamsModel) -> TaskModel:
    for task in request.app.state.tasks:
        if task.name == task_name:
            if duration := params.duration:
                task.duration = duration
            return TaskModel.model_validate(task)
    raise HTTPException(status_code=404, detail="Task not found")