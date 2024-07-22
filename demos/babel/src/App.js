import './App.css';
import logo from './logo.svg';

function App() {
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

function ReadDocs() {
  return (
    <a
      className="App-link"
      href="https://github.com/onlook-dev/studio"
      target="_blank"
      rel="noopener noreferrer"
    >
      Read Onlook docs
    </a>
  );
}

export default App;
