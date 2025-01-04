from pydantic import BaseModel, ConfigDict
from typing import List


class TaskModel(BaseModel):
    name: str
    status: str

    model_config = ConfigDict(from_attributes=True)


class TaskListModel(BaseModel):
    tasks: List[TaskModel]