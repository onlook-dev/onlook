import { TourSceneShot } from './LoginConcepts.js';

export function LoginAside(): React.JSX.Element {
  return (
    <div aria-hidden data-testid="login-aside" style={{ width: '100%', height: '100%', boxSizing: 'border-box' }}>
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          background: 'linear-gradient(to top, #e4ebf3 0%, #1a1d22 100%)',
        }}
      >
        <TourSceneShot />
      </div>
    </div>
  );
}
