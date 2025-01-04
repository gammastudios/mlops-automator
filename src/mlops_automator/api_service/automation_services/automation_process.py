from pendulum import datetime, now
import threading
from time import sleep


class AutomationProcess:
    """Simulation for an automation process"""
    def __init__(self, name, status='init', cycle_time=10):
        self.name = name
        self.status = status
        self.cycle_time = cycle_time

        # TODO - implement as an asyncio event loop instead of threading
        self.worker = None
        self.worker_lock = threading.Lock()
        self.worker_stop_event = threading.Event()

        self.cycles_completed = 0
        self.last_cycle_dttm = datetime(1900, 1, 1, 0, 0, 0, tz='UTC')

    
    def start_worker(self):
        """Start the process worker thread, creating if not already existing"""
        with self.worker_lock:
            if self.status != 'running':
                if self.worker is None or not self.worker.is_alive():
                    # start a new background deamon worker thread
                    self.worker_stop_event.clear()
                    self.worker = threading.Thread(target=self.do_work, daemon=True)
                    self.worker.start()
                    self.status = 'running'


    def stop_worker(self):
        """Stop the process worker thread"""
        with self.worker_lock:
            if self.status == 'running':
                self.worker_stop_event.set()
            self.status = 'stopped'


    def do_work(self):
        """Perform the process work - called as a background worker thread."""
        while not self.worker_stop_event.is_set():
            sleep(self.cycle_time)
            self.cycles_completed += 1
            self.last_cycle_dttm = now(tz='UTC')