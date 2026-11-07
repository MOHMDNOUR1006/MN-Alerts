import { useState, useEffect, useRef, useCallback } from 'react';
import { PriorityAlertQueue } from '../core/queue/PriorityAlertQueue.js';

export function useAlertQueue(options = {}) {
  const queueRef = useRef(null);
  if (!queueRef.current) {
    queueRef.current = new PriorityAlertQueue(options);
  }
  const queue = queueRef.current;

  const [activeAlert, setActiveAlert] = useState(null);
  const [queueSize, setQueueSize] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    const handleTrigger = (event) => {
      setActiveAlert(event);
      setQueueSize(queue.size());
    };
    const handleComplete = () => {
      setActiveAlert(null);
      setQueueSize(queue.size());
    };
    const handleSkipped = () => {
      setActiveAlert(null);
      setQueueSize(queue.size());
    };
    const handlePreempt = (data) => {
      // Immediate preemption: set active to preemptor or null
      setQueueSize(queue.size());
    };
    const handleOverflow = () => {
      setQueueSize(queue.size());
    };

    queue.on('alert_trigger', handleTrigger);
    queue.on('alert_complete', handleComplete);
    queue.on('alert_skipped', handleSkipped);
    queue.on('alert_preempt', handlePreempt);
    queue.on('queue_overflow', handleOverflow);

    return () => {
      queue.removeAllListeners();
    };
  }, [queue]);

  const enqueue = useCallback((event) => {
    const res = queue.enqueue(event);
    setQueueSize(queue.size());
    return res;
  }, [queue]);

  const skip = useCallback(() => {
    queue.skip();
    setQueueSize(queue.size());
  }, [queue]);

  const clear = useCallback(() => {
    queue.clear();
    setActiveAlert(null);
    setQueueSize(0);
  }, [queue]);

  const pause = useCallback(() => {
    queue.pause();
    setIsPaused(true);
  }, [queue]);

  const resume = useCallback(() => {
    queue.resume();
    setIsPaused(false);
  }, [queue]);

  const completeActive = useCallback(() => {
    queue.completeActive();
    setQueueSize(queue.size());
  }, [queue]);

  return {
    activeAlert,
    queueSize,
    isPaused,
    enqueue,
    skip,
    clear,
    pause,
    resume,
    completeActive,
    queue,
  };
}

export default useAlertQueue;
