from pydantic import BaseModel, ConfigDict
from typing import List

class ProcessModel(BaseModel):
    name: str
    status: str

    model_config = ConfigDict(from_attributes=True)

class ProcessListModel(BaseModel):
    processes: List[ProcessModel]