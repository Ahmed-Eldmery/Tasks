import React from 'react';
import { Task } from '../types';
import { Play, Pause, CheckCircle, Circle, Trash2, Clock } from 'lucide-react';

interface TaskItemProps {
  task: Task;
  onToggleTimer: (id: string) => void;
  onToggleComplete: (id: string) => void;
  onDelete: (id: string) => void;
}

const formatTime = (totalSeconds: number) => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
};

const TaskItem: React.FC<TaskItemProps> = ({ task, onToggleTimer, onToggleComplete, onDelete }) => {
  return (
    <div className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all duration-300 ${
      task.isTimerRunning 
        ? 'border-orange-400 bg-orange-50 shadow-lg shadow-orange-100 scale-[1.02]' 
        : task.isCompleted 
          ? 'border-gray-100 bg-gray-50/50 opacity-60' 
          : 'border-white bg-white hover:border-orange-100 shadow-sm'
    }`}>
      
      {/* Left: Check & Content */}
      <div className="flex items-center gap-4 flex-1 overflow-hidden">
        <button 
          onClick={() => onToggleComplete(task.id)}
          className={`transition-all duration-300 ${
            task.isCompleted ? 'text-orange-400' : 'text-gray-300 hover:text-orange-400'
          }`}
        >
          {task.isCompleted ? (
            <CheckCircle className="w-7 h-7" fill="currentColor" stroke="white" />
          ) : (
            <Circle className="w-7 h-7" />
          )}
        </button>
        
        <div className="flex flex-col min-w-0">
          <span className={`text-lg font-bold truncate transition-colors ${
            task.isCompleted ? 'line-through text-gray-400' : 'text-gray-800'
          }`}>
            {task.content}
          </span>
        </div>
      </div>

      {/* Right: Timer & Actions */}
      <div className="flex items-center gap-3 md:gap-5 pl-2">
        
        {/* Timer Display */}
        <div className={`flex items-center gap-2 font-mono text-sm md:text-base px-3 py-1 rounded-lg ${
          task.isTimerRunning ? 'bg-orange-100 text-orange-700 font-bold' : 'bg-gray-100 text-gray-500'
        }`}>
          <Clock className="w-4 h-4" />
          <span>{formatTime(task.durationSeconds)}</span>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1">
            {!task.isCompleted && (
                <button 
                    onClick={() => onToggleTimer(task.id)}
                    className={`p-2.5 rounded-xl transition-all ${
                    task.isTimerRunning 
                        ? 'bg-orange-500 text-white shadow-md shadow-orange-200 hover:bg-orange-600' 
                        : 'bg-gray-100 text-gray-600 hover:bg-orange-100 hover:text-orange-600'
                    }`}
                >
                    {task.isTimerRunning ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
                </button>
            )}

            <button 
                onClick={() => onDelete(task.id)}
                className="p-2.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
            >
                <Trash2 className="w-5 h-5" />
            </button>
        </div>
      </div>
    </div>
  );
};

export default TaskItem;