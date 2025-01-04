from fastapi import (
    APIRouter,
    HTTPException,
    Request,
)

from mlops_automator.api_service.models.task_model import (
    TaskModel,
    TaskListModel,
)

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


@tr.post("/task/{task_name}")
def create_task(task_name: str, status: str, request: Request) -> TaskModel:
    new_task = TaskModel(name=task_name)
    request.app.state.tasks.append(new_task)
    return new_task