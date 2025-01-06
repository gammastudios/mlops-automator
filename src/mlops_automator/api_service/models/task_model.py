from pydantic import BaseModel, ConfigDict, Field
from pydantic_extra_types.pendulum_dt import DateTime

from typing import List, Optional
from uuid import UUID, uuid4


class TaskModel(BaseModel):
    name: str
    duration: int
    status: str
    id: UUID = Field(default_factory=uuid4)
    start_dttm: DateTime
    finish_dttm: DateTime

    model_config = ConfigDict(from_attributes=True)


class TaskListModel(BaseModel):
    tasks: List[TaskModel]


class TaskParamsModel(BaseModel):
    # setting min duration to 1 second and max duration to 5 minutes
    duration: Optional[int] = Field(None, ge=1, le=60*5)

    model_config = ConfigDict(from_attributes=True)