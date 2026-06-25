import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useProperties, useCreateProperty, Property } from '../../hooks/useApi';
import { formatINR, formatPercent } from '../../utils/format';
import { Building2, MapPin, Plus, X, Loader2, ImagePlus, Trash2 } from 'lucide-react';
import { api } from '../../lib/api';
import toast from 'react-hot-toast';

export default function PropertiesPage({ onListProperty }: { onListProperty?: () => void }) {
  const { t } = useTranslation();
  const { data: properties = [], isLoading } = useProperties();
  const createProperty = useCreateProperty();

  const [selectedProperty, setSelectedProperty] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [uploadingUnit, setUploadingUnit] = useState<string | null>(null);
  // local photo_urls state keyed by unit id
  const [unitPhotos, setUnitPhotos] = useState<Record<string, string[]>>({});
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [activeUploadUnit, setActiveUploadUnit] = useState<string | null>(null);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeUploadUnit) return;
    e.target.value = '';
    setUploadingUnit(activeUploadUnit);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/api/upload/property-photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const url: string = res.data.data.url;
      // Merge with existing photos for this unit
      const currentPhotos = unitPhotos[activeUploadUnit] || [];
      const newPhotos = [...currentPhotos, url];
      setUnitPhotos(prev => ({ ...prev, [activeUploadUnit]: newPhotos }));
      // Save to DB
      await api.put(`/api/properties/units/${activeUploadUnit}`, { photo_urls: newPhotos });
      toast.success('Photo added!');
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || 'Upload failed');
    } finally {
      setUploadingUnit(null);
    }
  };

  const handleRemovePhoto = async (unitId: string, url: string) => {
    const currentPhotos = unitPhotos[unitId] || [];
    const newPhotos = currentPhotos.filter(u => u !== url);
    setUnitPhotos(prev => ({ ...prev, [unitId]: newPhotos }));
    try {
      await api.put(`/api/properties/units/${unitId}`, { photo_urls: newPhotos });
      toast.success('Photo removed');
    } catch {
      toast.error('Failed to remove photo');
    }
  };

  const [propName, setPropName] = useState('');
  const [propAddress, setPropAddress] = useState('');
  const [propCity, setPropCity] = useState('');
  const [propState, setPropState] = useState('');
  const [propPincode, setPropPincode] = useState('');
  const [propType, setPropType] = useState('residential');

  // Auto-select first property + seed unitPhotos from API data
  React.useEffect(() => {
    if (properties.length > 0) {
      if (!selectedProperty) setSelectedProperty(properties[0].id);
      const map: Record<string, string[]> = {};
      properties.forEach((p: any) => {
        (p.units || []).forEach((u: any) => {
          map[u.id] = u.photo_urls || [];
        });
      });
      setUnitPhotos(prev => ({ ...map, ...prev }));
    }
  }, [properties]);

  const currentProperty = properties.find((p: Property) => p.id === selectedProperty);
  const propertyUnits = currentProperty?.units || [];

  const handleAddProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await createProperty.mutateAsync({
      name: propName,
      address_line1: propAddress,
      city: propCity,
      state: propState,
      pincode: propPincode,
      property_type: propType as any,
    });
    if (ok) {
      setShowAddForm(false);
      setPropName(''); setPropAddress(''); setPropCity(''); setPropState(''); setPropPincode('');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--primary)' }} />
      </div>
    );
  }


  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1
            className="text-xl font-bold"
            style={{ fontFamily: 'Syne, Inter, sans-serif', color: 'var(--ink)', letterSpacing: '-0.02em' }}
          >
            {t('properties.title')}
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--ink-dim)' }}>{t('properties.subtitle')}</p>
        </div>
        <button onClick={() => onListProperty ? onListProperty() : setShowAddForm(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> {t('properties.add')}
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Property List */}
        <div className="space-y-3">
          {properties.map((prop: Property) => {
            const isSelected = prop.id === selectedProperty;
            return (
              <div
                key={prop.id}
                onClick={() => setSelectedProperty(prop.id)}
                className="p-4 flex flex-col gap-3 cursor-pointer transition-all duration-150 rounded-xl"
                style={{
                  background: 'var(--surface)',
                  border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                  boxShadow: isSelected ? '0 0 0 1px var(--primary-dim)' : 'none',
                }}
                onMouseEnter={e => {
                  if (!isSelected) (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(232,234,240,0.15)';
                }}
                onMouseLeave={e => {
                  if (!isSelected) (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)';
                }}
              >
                <div className="flex gap-3 items-start">
                  <div
                    className="p-2 rounded-lg shrink-0"
                    style={{ background: 'rgba(232,234,240,0.06)' }}
                  >
                    <Building2 className="w-4 h-4" style={{ color: 'var(--ink-dim)' }} />
                  </div>
                  <div>
                    <h3 className="font-medium text-sm" style={{ color: 'var(--ink)' }}>{prop.name}</h3>
                    <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: 'var(--ink-dim)' }}>
                      <MapPin className="w-3 h-3 shrink-0" /> {prop.city}, {prop.state}
                    </p>
                  </div>
                </div>
                <div className="divider" />
                <div className="flex items-center justify-between text-xs">
                  <span style={{ color: 'var(--ink-dim)' }}>{prop.city}</span>
                  <span className={prop.occupied_units > 0 ? 'badge-success' : 'badge-warning'}>
                    {prop.occupied_units > 0 ? 'Occupied' : 'Vacant'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Units Panel */}
        <div className="lg:col-span-2">
          {currentProperty ? (
            <div
              className="rounded-xl overflow-hidden"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              {/* Property header */}
              <div className="px-6 py-5 border-b" style={{ borderColor: 'var(--border)' }}>
                <h2 className="text-base font-semibold" style={{ color: 'var(--ink)' }}>{currentProperty.name}</h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--ink-dim)' }}>
                  {currentProperty.address_line1}, {currentProperty.city} — {currentProperty.pincode}
                </p>
              </div>

              {/* Hidden file input */}
              <input
                ref={photoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handlePhotoUpload}
              />

              {/* Units */}
              <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                {propertyUnits.map((unit) => {
                  const isVacant = unit.status === 'vacant';
                  const photos = unitPhotos[unit.id] || [];
                  const isUploading = uploadingUnit === unit.id;
                  return (
                    <div key={unit.id} className="px-6 py-5 space-y-4">
                      {/* Unit header row */}
                      <div className="flex items-center justify-between">
                        <span className={isVacant ? 'badge-warning' : 'badge-success'}>
                          {isVacant ? 'Vacant' : 'Occupied'}
                        </span>
                      </div>

                      {/* Details grid */}
                      <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                        <div className="flex justify-between text-xs">
                          <span style={{ color: 'var(--ink-dim)' }}>Type</span>
                          <span className="font-medium uppercase" style={{ color: 'var(--ink)' }}>{unit.unit_type}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span style={{ color: 'var(--ink-dim)' }}>Monthly Rent</span>
                          <span className="font-medium" style={{ color: 'var(--ink)' }}>{formatINR(unit.monthly_rent)}</span>
                        </div>
                        {unit.area_sqft && (
                          <div className="flex justify-between text-xs">
                            <span style={{ color: 'var(--ink-dim)' }}>Area</span>
                            <span className="font-medium" style={{ color: 'var(--ink)' }}>{unit.area_sqft} sq.ft</span>
                          </div>
                        )}
                        {unit.floor != null && (
                          <div className="flex justify-between text-xs">
                            <span style={{ color: 'var(--ink-dim)' }}>Floor</span>
                            <span className="font-medium" style={{ color: 'var(--ink)' }}>{unit.floor}</span>
                          </div>
                        )}
                      </div>

                      {/* Photos */}
                      <div className="space-y-2">
                        {photos.length > 0 && (
                          <div className="grid grid-cols-4 gap-2">
                            {photos.map((url, i) => (
                              <div key={i} className="relative group aspect-square rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                                <img src={url} alt="" className="w-full h-full object-cover" />
                                <button
                                  onClick={() => handleRemovePhoto(unit.id, url)}
                                  className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-white" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        {photos.length < 6 && (
                          <button
                            onClick={() => { setActiveUploadUnit(unit.id); photoInputRef.current?.click(); }}
                            disabled={isUploading}
                            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-medium transition-all"
                            style={{ border: '1px dashed var(--border)', color: 'var(--ink-dim)', background: 'transparent' }}
                          >
                            {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5" />}
                            {isUploading ? 'Uploading…' : photos.length === 0 ? 'Add Photos' : 'Add More Photos'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div
              className="rounded-xl p-12 text-center flex flex-col items-center gap-3"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <Building2 className="w-10 h-10" style={{ color: 'var(--ink-dim)', opacity: 0.4 }} />
              <h3 className="font-semibold" style={{ color: 'var(--ink)' }}>{t('properties.no_properties')}</h3>
              <p className="text-sm max-w-sm" style={{ color: 'var(--ink-dim)' }}>{t('properties.no_properties_desc')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Property Modal */}
      {showAddForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowAddForm(false); }}
        >
          <div
            className="w-full max-w-lg p-6 space-y-5 relative animate-scale-in"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
            }}
          >
            <button
              onClick={() => setShowAddForm(false)}
              className="btn-icon absolute top-4 right-4"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
            <div>
              <h2
                className="text-base font-bold flex items-center gap-2"
                style={{ fontFamily: 'Syne, Inter, sans-serif', color: 'var(--ink)', letterSpacing: '-0.02em' }}
              >
                <Building2 className="w-4 h-4" style={{ color: 'var(--ink-dim)' }} /> {t('properties.add')}
              </h2>
              <p className="text-xs mt-1" style={{ color: 'var(--ink-dim)' }}>Specify details for the new physical property</p>
            </div>

            <form onSubmit={handleAddProperty} className="space-y-4">
              <div>
                <label className="input-label">{t('properties.name')}</label>
                <input type="text" value={propName} onChange={(e) => setPropName(e.target.value)} placeholder="e.g. Sharma Heights" className="input" required />
              </div>
              <div>
                <label className="input-label">{t('properties.address')}</label>
                <input type="text" value={propAddress} onChange={(e) => setPropAddress(e.target.value)} placeholder="Street/Apt" className="input" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="input-label">{t('properties.city')}</label>
                  <input type="text" value={propCity} onChange={(e) => setPropCity(e.target.value)} placeholder="Bangalore" className="input" required />
                </div>
                <div>
                  <label className="input-label">{t('properties.state')}</label>
                  <input type="text" value={propState} onChange={(e) => setPropState(e.target.value)} placeholder="Karnataka" className="input" required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="input-label">{t('properties.pincode')}</label>
                  <input type="text" value={propPincode} onChange={(e) => setPropPincode(e.target.value)} placeholder="560001" maxLength={6} className="input" required />
                </div>
                <div>
                  <label className="input-label">{t('properties.type')}</label>
                  <select value={propType} onChange={(e) => setPropType(e.target.value)} className="input">
                    <option value="residential">{t('properties.residential')}</option>
                    <option value="commercial">{t('properties.commercial')}</option>
                    <option value="pg">{t('properties.pg')}</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowAddForm(false)} className="btn-secondary flex-1">{t('common.cancel')}</button>
                <button type="submit" className="btn-primary flex-1">{t('common.save')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
