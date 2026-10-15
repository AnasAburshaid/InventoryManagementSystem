import { BrowserRouter, Routes, Route } from 'react-router-dom';

function App() {
    return (
        <BrowserRouter>
            {/* This gray background wrapper ensures our app takes up the full screen */}
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <Routes>
                    {/* We will add the Login and Dashboard routes here soon */}
                    <Route path="/" element={
                        <h1 className="text-3xl font-bold text-blue-600">
                            Inventory Frontend Ready!
                        </h1>
                    } />
                </Routes>
            </div>
        </BrowserRouter>
    );
}

export default App;