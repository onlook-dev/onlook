import Script from "next/script";export default ({ children, isLoading, error



}: {children: React.ReactNode;isLoading?: boolean;error?: string;}) => {
  if (error) return <div className="error">Error: {error}</div>;
  if (isLoading) return <div className="loading">Loading...</div>;

  return (
    <div className="app-layout">
            <nav>Navigation</nav>
            <main>{children}</main>
        </div>);

};