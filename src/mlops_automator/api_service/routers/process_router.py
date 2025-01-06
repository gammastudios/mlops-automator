from fastapi import (
    APIRouter,
    HTTPException,
    Request,
)

from mlops_automator.api_service.models.process_model import (
    ProcessModel,
    ProcessListModel,
    ProcessParamsModel,
)

# create the router for process related routes
pr = APIRouter()


@pr.get("/processes")
def get_processes(request: Request) -> ProcessListModel:
    # from time import sleep
    # sleep(5)
    processes = [ProcessModel.model_validate(p) for p in request.app.state.processes]
    return ProcessListModel(processes=processes)


@pr.get("/processes/{process_name}")
def get_process(process_name: str, request: Request) -> ProcessModel:
    for process in request.app.state.processes:
        if process.name == process_name:
            return ProcessModel.model_validate(process)
    raise HTTPException(status_code=404, detail="Process not found")


@pr.patch("/process/{process_name}")
def update_process_attrs(request: Request, process_name: str, params: ProcessParamsModel) -> ProcessModel:
    for process in request.app.state.processes:
        if process.name == process_name:
            if status := params.status:
                if status.lower() == 'running':
                    process.start_worker()
                elif status.lower() == 'stopped':
                    process.stop_worker()
            return ProcessModel.model_validate(process)
    raise HTTPException(status_code=404, detail="Task not found")
