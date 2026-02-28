"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, Eye, EyeOff, Hash, Lock, Server, User } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BGPattern } from './BGPattern';
import { GlowEffect } from './GlowEffect';

export interface SSHCredentials {
  hostname: string;
  port: string;
  username: string;
  password: string;
}

interface SSHConnectionFormProps {
  onConnect: (credentials: SSHCredentials) => Promise<void>;
  isConnecting?: boolean;
}

interface ValidationState {
  hostname: boolean | null;
  port: boolean | null;
  username: boolean | null;
  password: boolean | null;
}

export const SSHConnectionForm: React.FC<SSHConnectionFormProps> = ({
  onConnect,
  isConnecting = false
}) => {
  const [formData, setFormData] = useState<SSHCredentials>({
    hostname: '',
    port: '22',
    username: '',
    password: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [validation, setValidation] = useState<ValidationState>({
    hostname: null,
    port: null,
    username: null,
    password: null,
  });

  const validateHostname = (value: string): boolean => {
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    const hostnameRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return ipRegex.test(value) || hostnameRegex.test(value);
  };

  const validatePort = (value: string): boolean => {
    const port = parseInt(value, 10);
    return !isNaN(port) && port > 0 && port <= 65535;
  };

  const handleInputChange = (field: keyof SSHCredentials, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    if (value.length > 0) {
      let isValid = false;
      switch (field) {
        case 'hostname':
          isValid = validateHostname(value);
          break;
        case 'port':
          isValid = validatePort(value);
          break;
        case 'username':
          isValid = value.length >= 3;
          break;
        case 'password':
          isValid = value.length >= 1;
          break;
      }
      setValidation(prev => ({ ...prev, [field]: isValid }));
    } else {
      setValidation(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleConnect = async () => {
    const allValid =
      validateHostname(formData.hostname) &&
      validatePort(formData.port) &&
      formData.username.length >= 3 &&
      formData.password.length >= 1;

    if (!allValid) {
      setValidation({
        hostname: validateHostname(formData.hostname),
        port: validatePort(formData.port),
        username: formData.username.length >= 3,
        password: formData.password.length >= 1,
      });
      return;
    }

    await onConnect(formData);
  };

  const getInputClassName = (field: keyof ValidationState) => {
    const baseClass = 'pl-10 pr-10 transition-all duration-300 bg-slate-900/50 border-slate-700 focus:border-cyan-400 focus:bg-slate-900/70';
    if (validation[field] === null) return baseClass;
    return validation[field]
      ? `${baseClass} border-emerald-500/60 focus:border-emerald-400`
      : `${baseClass} border-rose-500/60 focus:border-rose-400`;
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-slate-950 relative overflow-hidden">
      <BGPattern
        variant="dots"
        mask="fade-edges"
        fill="rgba(34, 211, 238, 0.14)"
        size={32}
      />

      <div className="absolute inset-0 bg-gradient-to-br from-cyan-950/30 via-slate-950 to-amber-950/20" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="relative w-full max-w-md"
      >
        <div className="relative">
          <GlowEffect
            colors={['#06B6D4', '#14B8A6', '#F59E0B', '#06B6D4']}
            mode="rotate"
            blur="stronger"
            duration={8}
            className="rounded-2xl"
          />

          <div className="relative bg-slate-900/85 backdrop-blur-xl rounded-2xl border border-slate-700/70 shadow-2xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-amber-500/5" />

            <div className="relative p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500/20 to-amber-500/20 border border-cyan-400/30">
                  <Server className="w-6 h-6 text-cyan-300" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">SSH Terminal Access</h2>
                  <p className="text-sm text-slate-400">Connessione sicura ai dispositivi</p>
                </div>
              </div>

              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="hostname" className="text-slate-200 flex items-center gap-2">
                    <Server className="w-4 h-4 text-cyan-300" />
                    Hostname o IP
                  </Label>
                  <div className="relative">
                    <Server className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      id="hostname"
                      type="text"
                      placeholder="192.168.1.100 o switch-core.local"
                      value={formData.hostname}
                      onChange={(e) => handleInputChange('hostname', e.target.value)}
                      className={getInputClassName('hostname')}
                      disabled={isConnecting}
                    />
                    {validation.hostname !== null && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {validation.hostname ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-rose-400" />
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="port" className="text-slate-200 flex items-center gap-2">
                    <Hash className="w-4 h-4 text-cyan-300" />
                    Porta
                  </Label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      id="port"
                      type="text"
                      placeholder="22"
                      value={formData.port}
                      onChange={(e) => handleInputChange('port', e.target.value)}
                      className={getInputClassName('port')}
                      disabled={isConnecting}
                    />
                    {validation.port !== null && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {validation.port ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-rose-400" />
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="username" className="text-slate-200 flex items-center gap-2">
                    <User className="w-4 h-4 text-cyan-300" />
                    Username
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      id="username"
                      type="text"
                      placeholder="admin"
                      value={formData.username}
                      onChange={(e) => handleInputChange('username', e.target.value)}
                      className={getInputClassName('username')}
                      disabled={isConnecting}
                    />
                    {validation.username !== null && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {validation.username ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-rose-400" />
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-slate-200 flex items-center gap-2">
                    <Lock className="w-4 h-4 text-cyan-300" />
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Inserisci password"
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      className={getInputClassName('password')}
                      disabled={isConnecting}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                      disabled={isConnecting}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <motion.div whileHover={{ scale: isConnecting ? 1 : 1.01 }} whileTap={{ scale: isConnecting ? 1 : 0.99 }}>
                  <Button
                    onClick={handleConnect}
                    disabled={isConnecting}
                    className="w-full bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-semibold py-6 rounded-lg shadow-lg shadow-cyan-500/20 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isConnecting ? 'Connessione in corso...' : 'Connetti'}
                  </Button>
                </motion.div>
              </div>

              <div className="mt-6 pt-6 border-t border-slate-700/60">
                <p className="text-xs text-slate-500 text-center">Le credenziali non vengono salvate dal frontend</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
