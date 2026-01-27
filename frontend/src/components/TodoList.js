import React, { useState, useEffect } from 'react';

const API_URL = 'http://localhost:5001/api';

function TodoList({ username, onLogout, logo }) {
  const [todos, setTodos] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [newDatetime, setNewDatetime] = useState('');

  // --- NEW: Profile Image Logic ---
  // We grab the filename/URL we saved in localStorage during login
  const profileImage = localStorage.getItem('todo_profile_image');

  // Determine the correct URL: 
  // If it's a URL (Google), use it directly. If it's a filename, point to our server's uploads.
  const getProfileImageUrl = () => {
    if (!profileImage || profileImage === 'null') return null;
    return profileImage.startsWith('http') 
        ? profileImage 
        : `http://localhost:5001/uploads/${profileImage}`;
  };

  useEffect(() => {
    const fetchTodos = async () => {
      try {
        const response = await fetch(`${API_URL}/todos/${username}`);
        const data = await response.json();
        setTodos(data);
      } catch (err) {
        console.error('Error fetching todos:', err);
      }
    };
    fetchTodos();
  }, [username]);

  const handleAddTodo = async (e) => {
    e.preventDefault();
    if (!newTask.trim()) {
        alert("Please enter a task description.");
        return;
    }

    try {
      const response = await fetch(`${API_URL}/todos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username: username, 
          task: newTask, 
          deadline: newDatetime || null, 
          status: 'Todo' 
        }),
      });

      if (response.ok) {
        const newTodo = await response.json();
        setTodos([newTodo, ...todos]);
        setNewTask('');
        setNewDatetime('');
      }
    } catch (err) {
      console.error('Network Error:', err);
    }
  };

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      await fetch(`${API_URL}/todos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      setTodos(prev =>
        prev.map((todo) =>
          todo.id === id ? { ...todo, status: newStatus } : todo
        )
      );
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const handleDeleteTodo = async (id) => {
    try {
      await fetch(`${API_URL}/todos/${id}`, { method: 'DELETE' });
      setTodos(prev => prev.filter((todo) => todo.id !== id));
    } catch (err) {
      console.error('Error deleting todo:', err);
    }
  };

  const renderTaskGroup = (status, bgColor) => {
    // Sort tasks by deadline (mapped to target_datetime in your DB)
    const filteredTasks = todos
      .filter((t) => (t.status || 'Todo').toLowerCase() === status.toLowerCase())
      .sort((a, b) => new Date(b.target_datetime || 0) - new Date(a.target_datetime || 0));
  
    return (
      <div className="flex-1 min-w-[250px]">
        <h3 className={`${bgColor} p-3 rounded-t-lg font-bold text-gray-700 shadow-sm uppercase text-xs tracking-widest`}>{status}</h3>
        <ul className="bg-gray-50 p-2 rounded-b-lg space-y-2 min-h-[150px] border border-t-0">
          {filteredTasks.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-6 italic">No tasks in {status}</p>
          )}
          {filteredTasks.map((todo) => (
            <li key={todo.id} className="bg-white p-3 rounded shadow-sm border border-gray-200 text-sm hover:border-blue-300 transition-colors">
              <div className="flex justify-between items-start mb-2">
                <span className="font-semibold text-gray-800">{todo.task}</span>
                <button onClick={() => handleDeleteTodo(todo.id)} className="text-gray-300 hover:text-red-500 transition-colors">✕</button>
              </div>
              
              <p className="text-[10px] text-gray-500 mb-3 flex items-center gap-1">
                📅 {todo.target_datetime ? new Date(todo.target_datetime).toLocaleString() : 'No deadline'}
              </p>
              
              <div className="flex gap-1 flex-wrap">
                {['Todo', 'Doing', 'Done'].map(s => (
                    status !== s && (
                        <button 
                            key={s}
                            onClick={() => handleUpdateStatus(todo.id, s)} 
                            className={`text-[9px] px-2 py-1 rounded font-bold uppercase tracking-wider ${
                                s === 'Todo' ? 'bg-gray-100 text-gray-500' : s === 'Doing' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'
                            }`}
                        >
                            {s}
                        </button>
                    )
                ))}
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <div className="bg-white w-full max-w-6xl rounded-2xl shadow-2xl p-6 md:p-10 border border-gray-100">
      
      {/* Header with Profile Image */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-10 pb-6 border-b border-gray-100 gap-4">
        <div className="flex items-center gap-5">
          <img src={logo} alt="CEI" className="h-14 w-14 object-contain" />
          <div className="flex items-center gap-4 border-l pl-5">
            {/* --- NEW: User Profile Icon --- */}
            {getProfileImageUrl() ? (
                <img 
                    src={getProfileImageUrl()} 
                    alt="Profile" 
                    className="w-12 h-12 rounded-full object-cover border-2 border-blue-500 shadow-sm"
                />
            ) : (
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-black text-xl shadow-md">
                    {username.charAt(0).toUpperCase()}
                </div>
            )}
            
            <div>
                <h1 className="text-2xl font-black text-gray-900 tracking-tighter leading-none">CEI TODO</h1>
                <p className="text-sm text-gray-500 font-medium mt-1">
                    Logged in as: <span className="text-blue-600 font-bold">{username}</span>
                </p>
            </div>
          </div>
        </div>
        <button onClick={onLogout} className="w-full md:w-auto bg-red-50 text-red-600 px-6 py-2.5 rounded-xl hover:bg-red-600 hover:text-white transition-all duration-200 font-bold text-sm shadow-sm">
            LOGOUT
        </button>
      </div>

      {/* Input Section */}
      <form onSubmit={handleAddTodo} className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-12 p-5 bg-blue-50/50 rounded-2xl border border-blue-100">
        <div className="md:col-span-2">
            <label className="block text-[10px] font-bold text-blue-400 uppercase mb-1 ml-1">Task Description</label>
            <input
              type="text"
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              placeholder="Ex: Web Lab1"
              className="w-full px-4 py-3 border-0 rounded-xl focus:ring-2 focus:ring-blue-400 outline-none shadow-inner"
            />
        </div>
        <div>
            <label className="block text-[10px] font-bold text-blue-400 uppercase mb-1 ml-1">Deadline (Optional)</label>
            <input
              type="datetime-local"
              value={newDatetime}
              onChange={(e) => setNewDatetime(e.target.value)}
              className="w-full px-4 py-3 border-0 rounded-xl focus:ring-2 focus:ring-blue-400 outline-none shadow-inner text-gray-600"
            />
        </div>
        <div className="flex items-end">
            <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-xl hover:bg-blue-700 transition-all font-black shadow-lg hover:shadow-blue-200 active:scale-95">
                + ADD TASK
            </button>
        </div>
      </form>

      {/* Columns */}
      <div className="flex flex-col md:flex-row gap-8">
        {renderTaskGroup('Todo', 'bg-gray-100 text-gray-600')}
        {renderTaskGroup('Doing', 'bg-blue-600 text-white')}
        {renderTaskGroup('Done', 'bg-emerald-500 text-white')}
      </div>
    </div>
  );
}

export default TodoList;