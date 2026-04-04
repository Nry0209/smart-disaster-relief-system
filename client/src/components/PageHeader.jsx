import React from 'react';
import { AlertCircle } from 'lucide-react';
import './PageHeader.css';

const PageHeader = ({ 
  role, 
  title, 
  description, 
  showReadOnlyBadge = false 
}) => {
  return (
    <div className="page-header">
      <div className="page-header-content">
        <span className="page-header-role">
          {role}
        </span>
        <h1 className="page-header-title">
          {title}
        </h1>
        <p className="page-header-description">
          {description}
        </p>
        {showReadOnlyBadge && (
          <div className="page-header-badge">
            <AlertCircle className="w-4 h-4" />
            Read-Only Access
          </div>
        )}
      </div>
    </div>
  );
};

export default PageHeader;
