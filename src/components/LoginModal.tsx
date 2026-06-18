// src/components/LoginModal/LoginModal.tsx

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import '../styles/LoginModal.css';

interface LoginModalProps {
  onClose?: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ onClose }) => {
  const { login } = useAuth();
  const [name, setName] = useState('');
  const [alias, setAlias] = useState('');
  const [az, setAz] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Name is required';
    if (!alias.trim()) newErrors.alias = 'Alias is required';
    else if (!/^[a-z0-9]{2,20}$/i.test(alias.trim()))
      newErrors.alias = 'Alias must be 2-20 alphanumeric characters';
    if (!az.trim()) newErrors.az = 'AZ is required (e.g. 7/55AZ)';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    login({
      name: name.trim(),
      alias: alias.trim().toLowerCase(),
      az: az.trim().toUpperCase(),
    });
    onClose?.();
  };

  return (
    <div className="login-overlay">
      <div className="login-modal">
        {/* Header */}
        <div className="login-header">
          <div className="login-logo">
            <span className="login-logo-text">amazon</span>
            <svg className="login-logo-smile" viewBox="0 0 100 20">
              <path
                d="M5 5 Q50 22 95 5"
                stroke="#FF9900"
                strokeWidth="4"
                fill="none"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <h2 className="login-title">
            optic-<span className="login-title-orange">amazon</span>
          </h2>
          <p className="login-subtitle">Sign in to continue</p>
        </div>

        {/* Form */}
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="login-field">
            <label htmlFor="login-name">Full Name</label>
            <input
              id="login-name"
              type="text"
              placeholder="e.g. Mike"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={errors.name ? 'error' : ''}
              autoComplete="off"
            />
            {errors.name && (
              <span className="login-error">{errors.name}</span>
            )}
          </div>

          <div className="login-field">
            <label htmlFor="login-alias">Amazon Alias</label>
            <input
              id="login-alias"
              type="text"
              placeholder="e.g. misimsr"
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              className={errors.alias ? 'error' : ''}
              autoComplete="off"
            />
            {errors.alias && (
              <span className="login-error">{errors.alias}</span>
            )}
          </div>

          <div className="login-field">
            <label htmlFor="login-az">
              AZ <span className="login-field-hint">(e.g. 7/55AZ)</span>
            </label>
            <input
              id="login-az"
              type="text"
              placeholder="e.g. 7/55AZ"
              value={az}
              onChange={(e) => setAz(e.target.value)}
              className={errors.az ? 'error' : ''}
              autoComplete="off"
            />
            {errors.az && (
              <span className="login-error">{errors.az}</span>
            )}
          </div>

          <button type="submit" className="login-submit">
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginModal;
