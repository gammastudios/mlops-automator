from pydantic import BaseModel, ConfigDict
from pydantic_extra_types.pendulum_dt import DateTime
from typing import List, Optional

class ProcessModel(BaseModel):
    name: str
    status: str
    # number of seconds per process cycle
    cycle_time: int
    cycles_completed: int
    last_cycle_dttm: DateTime

    model_config = ConfigDict(from_attributes=True)


class ProcessParamsModel(BaseModel):
    status: Optional[str] = None
    cycle_time: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)

class ProcessListModel(BaseModel):
    processes: List[ProcessModel]