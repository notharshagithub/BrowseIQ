import React from 'react';
import { Cpu, Play } from 'lucide-react';

export default function TaskCard({
  taskDesc,
  setTaskDesc,
  taskSteps,
  setTaskSteps,
  sessionUrl,
  status,
  loadingTask,
  onLaunch,
}) {
  // Autopilot loop is disabled if there's no active session or we are currently working
  const isLaunchDisabled = !sessionUrl || status === 'running' || status === 'connecting' || !taskDesc.trim();

  const handleLaunch = () => {
    onLaunch();
  };

  return (
    <div className="section-card">
      <span className="section-title">
        <Cpu className="title-icon" />
        Autopilot Task
      </span>
      <div className="input-group">
        <label htmlFor="task-desc">Task Instructions (Plain English)</label>
        <textarea
          id="task-desc"
          placeholder="E.g. Type 'playwright python' into the search input and hit search."
          value={taskDesc}
          onChange={(e) => setTaskDesc(e.target.value)}
          disabled={status === 'running' || status === 'connecting'}
        />
      </div>
      <div className="input-group">
        <label htmlFor="task-steps">Max Step Limit</label>
        <select
          id="task-steps"
          value={taskSteps}
          onChange={(e) => setTaskSteps(Number(e.target.value))}
          disabled={status === 'running' || status === 'connecting'}
        >
          <option value={5}>5 Steps</option>
          <option value={10}>10 Steps</option>
          <option value={15}>15 Steps</option>
        </select>
      </div>
      <button
        className="btn btn-pink"
        id="btn-run-task"
        onClick={handleLaunch}
        disabled={isLaunchDisabled || loadingTask}
      >
        {loadingTask ? (
          <>
            <span className="loader"></span>
            <span>Running Autopilot...</span>
          </>
        ) : (
          <>
            <Play className="btn-icon" />
            <span>Launch Agentic Loop</span>
          </>
        )}
      </button>
    </div>
  );
}
