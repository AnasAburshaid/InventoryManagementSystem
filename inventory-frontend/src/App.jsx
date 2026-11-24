import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import Layout from './components/layout/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import WarehousesPage from './pages/WarehousesPage';
import WarehouseDetailPage from './pages/WarehouseDetailPage';
import ProductsPage from './pages/ProductsPage';
import StockMovementsPage from './pages/StockMovementsPage';
import SuppliersPage from './pages/SuppliersPage';
import SupplierDetailPage from './pages/SupplierDetailPage';
import CustomersPage from './pages/CustomersPage';
import SupplierProductsPage from './pages/SupplierProductsPage';
import PurchaseOrdersPage from './pages/PurchaseOrdersPage';
import SalesOrdersPage from './pages/SalesOrdersPage';
import StockCountsPage from './pages/StockCountsPage';
import ReplenishmentPage from './pages/ReplenishmentPage';
import AuditLogsPage from './pages/AuditLogsPage';
import AssistantPage from './pages/AssistantPage';

function App() {
    return (
        <ThemeProvider>
            <AuthProvider>
                <BrowserRouter>
                    <Routes>
                    {/* Public Login Route */}
                    <Route path="/login" element={<LoginPage />} />

                    {/* Protected Application Routes */}
                    <Route
                        path="/"
                        element={
                            <ProtectedRoute>
                                <Layout>
                                    <DashboardPage />
                                </Layout>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/warehouses"
                        element={
                            <ProtectedRoute>
                                <Layout>
                                    <WarehousesPage />
                                </Layout>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/warehouses/:id"
                        element={
                            <ProtectedRoute>
                                <Layout>
                                    <WarehouseDetailPage />
                                </Layout>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/products"
                        element={
                            <ProtectedRoute>
                                <Layout>
                                    <ProductsPage />
                                </Layout>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/stock-movements"
                        element={
                            <ProtectedRoute>
                                <Layout>
                                    <StockMovementsPage />
                                </Layout>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/suppliers"
                        element={
                            <ProtectedRoute>
                                <Layout>
                                    <SuppliersPage />
                                </Layout>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/suppliers/:id"
                        element={
                            <ProtectedRoute>
                                <Layout>
                                    <SupplierDetailPage />
                                </Layout>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/customers"
                        element={
                            <ProtectedRoute>
                                <Layout>
                                    <CustomersPage />
                                </Layout>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/supplier-products"
                        element={
                            <ProtectedRoute>
                                <Layout>
                                    <SupplierProductsPage />
                                </Layout>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/purchase-orders"
                        element={
                            <ProtectedRoute>
                                <Layout>
                                    <PurchaseOrdersPage />
                                </Layout>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/sales-orders"
                        element={
                            <ProtectedRoute>
                                <Layout>
                                    <SalesOrdersPage />
                                </Layout>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/stock-counts"
                        element={
                            <ProtectedRoute>
                                <Layout>
                                    <StockCountsPage />
                                </Layout>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/replenishment"
                        element={
                            <ProtectedRoute>
                                <Layout>
                                    <ReplenishmentPage />
                                </Layout>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/audit-logs"
                        element={
                            <ProtectedRoute>
                                <Layout>
                                    <AuditLogsPage />
                                </Layout>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/assistant"
                        element={
                            <ProtectedRoute>
                                <Layout>
                                    <AssistantPage />
                                </Layout>
                            </ProtectedRoute>
                        }
                    />

                    {/* Catch all fallback */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    </ThemeProvider>
    );
}

export default App;