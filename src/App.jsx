import { useState } from 'react'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="app">
      <header className="app-header">
        <h1>Portfolio Website</h1>
        <p>Built with Vite + React</p>
      </header>
      
      <main className="app-main">
        <section>
          <h2>Welcome</h2>
          <p>This is your portfolio website template.</p>
          <p>Built with modern tools and best practices for performance and accessibility.</p>
        </section>

        <section>
          <h2>Counter Demo</h2>
          <button onClick={() => setCount((count) => count + 1)}>
            Count is {count}
          </button>
          <p>This demo shows that the build tool is working correctly!</p>
        </section>
      </main>

      <footer className="app-footer">
        <p>&copy; 2024 Portfolio Website. All rights reserved.</p>
      </footer>
    </div>
  )
}

export default App
