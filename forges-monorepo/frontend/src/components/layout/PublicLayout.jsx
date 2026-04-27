import { Outlet } from 'react-router-dom';
import PropTypes from 'prop-types';
import Navbar from './Navbar';
import Footer from './Footer';

/**
 * PublicLayout - Layout pour les pages publiques non authentifiées
 * Utilisé pour : /, /login, /register, /catalogue, etc.
 * Référence : CLAUDE.md section 17.3
 */
export default function PublicLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-bg">
      <Navbar variant="public" />

      <main className="flex-1">
        {children || <Outlet />}
      </main>

      <Footer />
    </div>
  );
}

PublicLayout.propTypes = {
  children: PropTypes.node,
};
