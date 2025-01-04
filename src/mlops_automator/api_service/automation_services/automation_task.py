import pendulum
import threading
from time import sleep
from uuid import UUID, uuid4


class AutomationTaskAlreadyExistsError(Exception):
    pass


class AutomationTask:
    """
    Simulation for an automation task

    A kind of automation task would use a different style of factory implementation, with task instance
    history being tracked and available for inspection.  As this example doesn't make use of a database
    or persistence, a simpler "most recent" factory style model is used.
    """
    
    def __init__(self, name, task_duration=60):
        self.name = name
        self.status = "init"
        # default to an initual all zero UUID
        self.id = UUID(int=0)

        # how long the simulated task will run in seconds
        self.duration = task_duration

        self.worker = None
        self.worker_lock = threading.Lock()

        self.low_dttm = pendulum.datetime(1900, 1, 1, 0, 0, 0, tz='UTC')
        self.start_dttm = self.low_dttm
        self.finish_dttm = self.low_dttm


    def start_task(self):
        # if there is no task already running, start a new task,
        # otherwise raise an exception
        with self.worker_lock:
            if self.status == 'running':
                # there is already a running task
                raise AutomationTaskAlreadyExistsError(f"Task {self.id} is already running")

            # start a new task worker thread
            self.id = uuid4()
            self.worker = threading.Thread(target=self.do_work, daemon=True)
            self.worker.start()
            self.status = 'running'
            self.start_dttm = pendulum.now('UTC')
            self.finish_dttm = self.low_dttm


    def do_work(self):
        # simulate the task work updating status on completion
        sleep(self.duration)
        self.finish_dttm = pendulum.now('UTC')
        self.status = 'finished'
    