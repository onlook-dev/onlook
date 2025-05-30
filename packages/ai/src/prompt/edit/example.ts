import { CODE_FENCE } from '../format';

const user1 = 'Create a new TodoList component with basic functionality';
const projectPath = '/path/to/your/project';

export const assistant1 = `Let's create a new TodoList component with basic functionality:
1. Create the TodoList component with state management
2. Add the ability to toggle todo items
3. Include basic styling

Here's the updated code:

${projectPath}/components/TodoList.tsx
${CODE_FENCE.start}tsx
import { useState } from 'react';

interface Todo {
  id: number;
  text: string;
  completed: boolean;
}

export function TodoList() {
  const [todos, setTodos] = useState<Todo[]>([
    { id: 1, text: 'Learn React', completed: false },
    { id: 2, text: 'Build Todo App', completed: false },
  ]);

  const toggleTodo = (id: number) => {
    setTodos(todos.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ));
  };

  return (
    <ul>
      {todos.map(todo => (
        <li key={todo.id} className="flex items-center gap-2 p-2">
          <input
            type="checkbox"
            checked={todo.completed}
            onChange={() => toggleTodo(todo.id)}
          />
          <span className={todo.completed ? 'line-through' : ''}>
            {todo.text}
          </span>
        </li>
      ))}
    </ul>
  );
}`;

const user2 = 'Refactor the TodoList by extracting the TodoItem into its own component';

export const assistant2 = `Let's refactor the TodoList by extracting the TodoItem into its own component:
1. Create a new TodoItem component
2. Move the item rendering logic to the new component
3. Update the TodoList to use the new component

Here's the updated code:

${projectPath}/components/TodoItem.tsx
${CODE_FENCE.start}tsx
interface TodoItemProps {
  id: number;
  text: string;
  completed: boolean;
  onToggle: (id: number) => void;
}

export function TodoItem({ id, text, completed, onToggle }: TodoItemProps) {
  return (
    <li className="flex items-center gap-2 p-2">
      <input
        type="checkbox"
        checked={completed}
        onChange={() => onToggle(id)}
      />
      <span className={completed ? 'line-through' : ''}>
        {text}
      </span>
    </li>
  );
}
${CODE_FENCE.end}

${projectPath}/components/TodoList.tsx
${CODE_FENCE.start}tsx
import { useState } from 'react';
import { TodoItem } from './TodoItem';

${projectPath}/components/TodoList.tsx
${CODE_FENCE.start}tsx
// ... existing code ...
  return (
    <ul>
      {todos.map(todo => (
        <TodoItem
          key={todo.id}
          {...todo}
          onToggle={toggleTodo}
        />
      ))}
    </ul>
  );
}
${CODE_FENCE.end}`;

export const SEARCH_REPLACE_EXAMPLE_CONVERSATION = [
    {
        role: 'user',
        content: user1,
    },
    {
        role: 'assistant',
        content: assistant1,
    },
    {
        role: 'user',
        content: user2,
    },
    {
        role: 'assistant',
        content: assistant2,
    },
];
