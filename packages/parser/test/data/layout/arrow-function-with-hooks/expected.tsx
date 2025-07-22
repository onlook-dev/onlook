import { useState, useEffect } from 'react';import Script from "next/script";

export default ({ children }: {children: React.ReactNode;}) => {
  const [theme, setTheme] = useState('light');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className={`theme-${theme}`}>
            <header>My App</header>
            {children}
            <footer>Footer</footer>
        </div>);

};