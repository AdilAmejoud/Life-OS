import React, { useEffect, useState } from 'react';
import { getCredentials, saveCredential, deleteCredential } from '../utils/api';
import { Shield, Plus, Trash2, Github, Mail, Calendar, Link, X } from 'lucide-react';

// Service configurations
const SERVICE_CONFIG = {
  github: { label: 'GitHub', icon: Github, placeholder: 'ghp_xxx...' },
  gmail: { label: 'Gmail', icon: Mail, placeholder: 'OAuth credentials JSON' },
  gcal: { label: 'Google Calendar', icon: Calendar, placeholder: 'OAuth credentials JSON' },
  notion: { label: 'Notion', icon: Link, placeholder: 'Notion integration token' }
};

export default function CredentialManager({ showToast, panelOpen, setPanelOpen }) {
  const [credentials, setCredentials] = useState([]);
  const [selectedService, setSelectedService] = useState('github');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [keyName, setKeyName] = useState('');
  const [value, setValue] = useState('');

  useEffect(() => {
    loadCredentials();
  }, []);

  const loadCredentials = async () => {
    try {
      const data = await getCredentials();
      setCredentials(data);
    } catch (error) {
      showToast('Failed to load credentials', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!keyName.trim() || !value.trim()) {
      showToast('Please provide both key name and value', 'warning');
      return;
    }

    try {
      setSaving(true);
      await saveCredential({
        service: selectedService,
        keyName: keyName.trim(),
        value: value.trim()
      });
      showToast('Credential saved successfully', 'success');
      setKeyName('');
      setValue('');
      loadCredentials();
    } catch (error) {
      showToast('Failed to save credential', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (service, keyName) => {
    if (!window.confirm(`Delete credential: ${keyName} (${service})?`)) return;
    try {
      await deleteCredential(service, keyName);
      showToast('Credential deleted', 'success');
      loadCredentials();
    } catch (error) {
      showToast('Failed to delete credential', 'error');
    }
  };

  const getServiceConfig = (service) => SERVICE_CONFIG[service] || { label: service, icon: Shield, placeholder: 'Enter value' };

  return (
    <div className="flex flex-col h-full w-full bg-bg-main overflow-y-auto relative">
      <div className="max-w-[800px] mx-auto w-full pt-[60px] px-6 pb-12">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-[40px] h-[40px] rounded-[10px] bg-bg-card flex items-center justify-center shrink-0 border border-border">
            <Shield size={20} className="text-accent" />
          </div>
          <h1 className="text-[24px] font-medium text-text-primary">Credentials</h1>
        </div>
        <p className="text-[14px] text-text-secondary mb-8">
          Manage API keys and OAuth tokens for external services.
        </p>

        {/* Service Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {Object.keys(SERVICE_CONFIG).map((service) => (
            <button
              key={service}
              onClick={() => setSelectedService(service)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-medium transition-all ${
                selectedService === service
                  ? 'bg-accent text-bg-main'
                  : 'bg-bg-input text-text-secondary hover:bg-bg-hover'
              }`}
            >
              {React.createElement(SERVICE_CONFIG[service].icon, { size: 14 })}
              {SERVICE_CONFIG[service].label}
            </button>
          ))}
        </div>

        {/* Saved Credentials */}
        <div className="mb-8">
          <h3 className="text-[14px] font-medium text-text-primary mb-3 flex items-center gap-2">
            <Link size={14} className="text-text-muted" />
            Saved ({credentials.length})
          </h3>
          {loading ? (
            <div className="text-center py-8 text-text-muted font-mono text-[12px] uppercase tracking-wider animate-pulse">
              Loading credentials...
            </div>
          ) : credentials.length === 0 ? (
            <div className="text-center py-12 bg-bg-card rounded-[12px] border border-border text-text-muted text-[14px]">
              No credentials configured for {getServiceConfig(selectedService).label}
            </div>
          ) : (
            <div className="space-y-3">
              {credentials
                .filter((c) => c.service === selectedService)
                .map((cred) => (
                  <div
                    key={cred.id}
                    className="bg-bg-card border border-border rounded-[12px] p-4 flex items-center justify-between group hover:border-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-bg-input rounded-md">
                        {React.createElement(SERVICE_CONFIG[selectedService]?.icon || Shield, { size: 16 })}
                      </div>
                      <div>
                        <p className="text-[14px] font-medium text-text-primary">{cred.key_name}</p>
                        <p className="text-[11px] text-text-muted">
                          Saved {new Date(cred.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(cred.service, cred.key_name)}
                      className="p-2 text-text-muted hover:text-error hover:bg-error/10 rounded-md transition-colors"
                      title="Delete credential"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Add New Credential */}
        <div className="bg-bg-card border border-border rounded-[12px] p-6">
          <h3 className="text-[14px] font-medium text-text-primary mb-4 flex items-center gap-2">
            <Plus size={14} className="text-accent" />
            Add New Credential
          </h3>
          <form onSubmit={handleSave} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-mono text-text-muted mb-1.5 uppercase tracking-wider">
                  Key Name
                </label>
                <input
                  type="text"
                  required
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  className="w-full bg-bg-input border border-border rounded-[8px] px-3 py-2 text-[13px] text-text-primary focus:border-accent outline-none transition-colors"
                  placeholder="e.g., token, credentials"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono text-text-muted mb-1.5 uppercase tracking-wider">
                  Service
                </label>
                <div className="w-full bg-bg-input border border-border rounded-[8px] px-3 py-2 text-[13px] text-text-primary flex items-center gap-2">
                  {React.createElement(SERVICE_CONFIG[selectedService]?.icon || Shield, { size: 14 })}
                  <span className="flex-1">{getServiceConfig(selectedService).label}</span>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-mono text-text-muted mb-1.5 uppercase tracking-wider">
                Value / Token
              </label>
              <textarea
                required
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="w-full bg-bg-input border border-border rounded-[8px] px-3 py-2 text-[13px] text-text-primary focus:border-accent outline-none transition-colors placeholder:text-text-muted"
                placeholder={getServiceConfig(selectedService).placeholder}
                rows={3}
              />
              <p className="text-[11px] text-text-muted mt-1.5">
                Store your API key or OAuth credentials securely. Values are encrypted in the database.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-accent text-bg-main font-medium text-[13px] py-2.5 rounded-[8px] hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-bg-main border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Plus size={14} />
                    Save Credential
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
