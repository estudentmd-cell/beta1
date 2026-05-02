import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Pipeline from './pages/Pipeline';
import Orders from './pages/Orders';
import Clients from './pages/Clients';
import Layouts from './pages/Layouts';
import PrintDelivery from './pages/PrintDelivery';
import Finance from './pages/Finance';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'pipeline', element: <Pipeline /> },
      { path: 'orders', element: <Orders /> },
      { path: 'clients', element: <Clients /> },
      { path: 'layouts', element: <Layouts /> },
      { path: 'print', element: <PrintDelivery /> },
      { path: 'finance', element: <Finance /> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
