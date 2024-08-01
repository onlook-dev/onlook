import './App.css';
import logo from './logo.svg';
import ReadDocs from './ReadDocs';

export default function App() {
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Check <code className='underline'>config-override.js</code> to see how this was set up.
        </p>
        <ReadDocs />
      </header>
    </div>
  );
}

