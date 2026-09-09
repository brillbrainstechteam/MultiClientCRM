import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { CatalogueOrdersLayout } from './CatalogueOrdersLayout';
import CommerceRealScreen from './screens/CommerceRealScreen';
import CatalogueListScreen from './screens/CatalogueListScreen';
import CatalogueFormScreen from './screens/CatalogueFormScreen';
import CatalogueExplorerScreen from './screens/CatalogueExplorerScreen';
import CatalogueSchemaScreen from './screens/CatalogueSchemaScreen';
import CatalogueItemDetailScreen from './screens/CatalogueItemDetailScreen';
import CatalogueImportScreen from './screens/CatalogueImportScreen';
import MediaManagerScreen from './screens/MediaManagerScreen';
import BulkMediaMatchScreen from './screens/BulkMediaMatchScreen';
import InventoryScreen from './screens/InventoryScreen';
import CataloguePickerHostScreen from './screens/CataloguePickerHostScreen';
import ShareComposerScreen from './screens/ShareComposerScreen';
import SelectionsRealScreen from './screens/SelectionsRealScreen';
import SelectionBuilderScreen from './screens/SelectionBuilderScreen';
import OrdersListScreen from './screens/OrdersListScreen';
import OrderDetailScreen from './screens/OrderDetailScreen';
import CreateOrderRequestScreen from './screens/CreateOrderRequestScreen';
import ReturnsListScreen from './screens/ReturnsListScreen';
import ReturnDetailScreen from './screens/ReturnDetailScreen';
import SyncAuditHistoryScreen from './screens/SyncAuditHistoryScreen';

/**
 * Index redirect that preserves the query string — the dashboard's "Orders &
 * payments" widget deep-links to `/catalogue-orders?status=delayed` etc.
 * (SKILL.md §16 audit note), and a plain `<Navigate to="overview" />` would
 * silently drop those params instead of letting Overview drill through them.
 */
function IndexRedirect() {
  const location = useLocation();
  return <Navigate to={{ pathname: 'overview', search: location.search }} replace />;
}

/** Route table (SKILL.md §6 "Route adapter"). */
export function CatalogueOrdersRoutes() {
  return (
    <Routes>
      <Route element={<CatalogueOrdersLayout />}>
        <Route index element={<IndexRedirect />} />
        <Route path="overview" element={<CommerceRealScreen />} />
        <Route path="commerce" element={<CommerceRealScreen />} />
        <Route path="catalogues" element={<CatalogueListScreen />} />
        <Route path="catalogues/new" element={<CatalogueFormScreen />} />
        <Route path="catalogues/:catalogueId/edit" element={<CatalogueFormScreen />} />
        <Route path="catalogues/:catalogueId/explorer" element={<CatalogueExplorerScreen />} />
        <Route path="catalogues/:catalogueId/schema" element={<CatalogueSchemaScreen />} />
        <Route path="catalogues/:catalogueId/items/:itemId" element={<CatalogueItemDetailScreen />} />
        <Route path="catalogues/:catalogueId/import" element={<CatalogueImportScreen />} />
        <Route path="catalogues/:catalogueId/media" element={<MediaManagerScreen />} />
        <Route path="catalogues/:catalogueId/media/bulk-match" element={<BulkMediaMatchScreen />} />
        <Route path="inventory" element={<InventoryScreen />} />
        <Route path="picker" element={<CataloguePickerHostScreen />} />
        <Route path="share" element={<ShareComposerScreen />} />
        <Route path="selections" element={<SelectionsRealScreen />} />
        <Route path="selections/new" element={<SelectionBuilderScreen />} />
        <Route path="selections/:selectionId" element={<SelectionBuilderScreen />} />
        <Route path="orders" element={<OrdersListScreen />} />
        <Route path="orders/new" element={<CreateOrderRequestScreen />} />
        <Route path="orders/:orderId" element={<OrderDetailScreen />} />
        <Route path="returns" element={<ReturnsListScreen />} />
        <Route path="returns/new" element={<ReturnDetailScreen />} />
        <Route path="returns/:returnId" element={<ReturnDetailScreen />} />
        <Route path="sync" element={<SyncAuditHistoryScreen />} />
        <Route path="*" element={<Navigate to="/catalogue-orders/catalogues" replace />} />
      </Route>
    </Routes>
  );
}
