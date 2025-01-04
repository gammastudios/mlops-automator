from fastapi import (
    APIRouter,
    HTTPException,
    Request,
)

from mlops_automator.api_service.models.process_model import (
    ProcessModel,
    ProcessListModel,
)

# create the router for process related routes
pr = APIRouter()


@pr.get("/processes")
def get_processes(request: Request) -> ProcessListModel:
    processes = [ProcessModel.model_validate(p) for p in request.app.state.processes]
    return ProcessListModel(processes=processes)


@pr.get("/processes/{process_name}")
def get_process(process_name: str, request: Request) -> ProcessModel:
    for process in request.app.state.processes:
        if process.name == process_name:
            return ProcessModel.model_validate(process)
    raise HTTPException(status_code=404, detail="Process not found")


@pr.patch("/process/{process_name}")
def update_process_status(process_name: str, status: str, request: Request) -> ProcessModel:
    for process in request.app.state.processes:
        if process.name == process_name:
            process.status = status
            return ProcessModel.model_validate(process)
    raise HTTPException(status_code=404, detail="Task not found")
