import React, { useState, useEffect } from 'react';
import { Home, Plus, Search, Filter, MapPin, DollarSign, Copy, Edit2, Trash2, ExternalLink, Briefcase, Layers, Save, Phone, User, Trash, ArrowUpDown } from 'lucide-react';
import { supabase } from '../config/supabase';
import { formatCurrency, OPTIONS } from '../utils/helpers';
import Modal from './UI/Modal';

const Properties = ({ user }) => {
  const [properties, setProperties] = useState([]);
  const [filteredProperties, setFilteredProperties] = useState([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('all'); // 'all', 'individual', 'projects'
  
  // Modal & Form States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Dynamic Form Field States
  const [formData, setFormData] = useState({
    code: '',
    title: '',
    property_type: 'Apartamento',
    region: '',
    price: '',
    commission_rate: 5.00,
    owner_name: '',
    owner_phone: '',
    photos_url: '',
    is_project: false,
    notes: ''
  });

  // Typology/Floorplans List State
  const [typologies, setTypologies] = useState([]);
  const [newTypology, setNewTypology] = useState({
    name: '',
    size: '',
    price: '',
    status: 'Disponível'
  });

  useEffect(() => {
    fetchProperties();
  }, [user]);

  useEffect(() => {
    // Apply dynamic searching & filtering
    let result = properties;

    if (search.trim() !== '') {
      const q = search.toLowerCase();
      result = result.filter(p => 
        p.title.toLowerCase().includes(q) || 
        p.code.toLowerCase().includes(q) || 
        p.region.toLowerCase().includes(q) ||
        p.property_type.toLowerCase().includes(q)
      );
    }

    if (typeFilter !== '') {
      result = result.filter(p => p.property_type === typeFilter);
    }

    if (projectFilter === 'individual') {
      result = result.filter(p => !p.is_project);
    } else if (projectFilter === 'projects') {
      result = result.filter(p => p.is_project);
    }

    setFilteredProperties(result);
  }, [search, typeFilter, projectFilter, properties]);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('is_deleted', false);
        
      if (error) throw error;
      setProperties(data || []);
    } catch (e) {
      console.error('Erro ao buscar imóveis:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingProperty(null);
    setFormData({
      code: '',
      title: '',
      property_type: 'Apartamento',
      region: '',
      price: '',
      commission_rate: 5.00,
      owner_name: '',
      owner_phone: '',
      photos_url: '',
      is_project: false,
      notes: ''
    });
    setTypologies([]);
    setNewTypology({ name: '', size: '', price: '', status: 'Disponível' });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (prop) => {
    setEditingProperty(prop);
    setFormData({
      code: prop.code,
      title: prop.title,
      property_type: prop.property_type,
      region: prop.region,
      price: prop.price || '',
      commission_rate: prop.commission_rate || 5.00,
      owner_name: prop.owner_name || '',
      owner_phone: prop.owner_phone || '',
      photos_url: prop.photos_url || '',
      is_project: prop.is_project || false,
      notes: prop.notes || ''
    });
    setTypologies(prop.typologies || []);
    setNewTypology({ name: '', size: '', price: '', status: 'Disponível' });
    setIsModalOpen(true);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Typology Form Methods
  const handleTypologyChange = (e) => {
    const { name, value } = e.target;
    setNewTypology(prev => ({ ...prev, [name]: value }));
  };

  const handleAddTypology = () => {
    if (!newTypology.name || !newTypology.size) {
      alert('Por favor, preencha o nome da planta (ex: 2 Quartos) e a metragem (ex: 64m²).');
      return;
    }
    
    setTypologies(prev => [
      ...prev,
      {
        ...newTypology,
        price: newTypology.price ? parseFloat(newTypology.price) : null
      }
    ]);
    
    // Clear input typologies
    setNewTypology({
      name: '',
      size: '',
      price: '',
      status: 'Disponível'
    });
  };

  const handleRemoveTypology = (index) => {
    setTypologies(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.code || !formData.title || !formData.region) {
      alert('Por favor, preencha todos os campos obrigatórios: Código, Nome do Imóvel e Região.');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        ...formData,
        code: formData.code.toUpperCase().trim(),
        price: formData.is_project ? null : (formData.price ? parseFloat(formData.price) : null),
        commission_rate: formData.commission_rate ? parseFloat(formData.commission_rate) : 5.00,
        typologies: formData.is_project ? typologies : [],
        owner_id: user?.id
      };

      if (editingProperty) {
        const { error } = await supabase
          .from('properties')
          .update(payload)
          .eq('id', editingProperty.id);
        if (error) throw error;
        alert('Imóvel atualizado com sucesso na carteira!');
      } else {
        const { error } = await supabase
          .from('properties')
          .insert(payload);
        if (error) throw error;
        alert('Imóvel cadastrado com sucesso na carteira!');
      }

      setIsModalOpen(false);
      fetchProperties();
    } catch (err) {
      alert('Erro ao salvar imóvel: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProperty = async (prop) => {
    const confirmDelete = window.confirm(`Tem certeza que deseja excluir o imóvel "${prop.title} [${prop.code}]" da sua carteira?`);
    if (!confirmDelete) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from('properties')
        .update({ is_deleted: true })
        .eq('id', prop.id);
      
      if (error) throw error;
      alert('Imóvel removido da carteira.');
      fetchProperties();
    } catch (err) {
      alert('Erro ao excluir imóvel: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPropertySummary = (prop) => {
    const realtor = user?.user_metadata?.full_name || 'Corretora Loreny';
    const company = user?.user_metadata?.company || 'Loreny Imóveis';
    const realtorPhone = user?.user_metadata?.phone || '';
    
    let text = `🏢 *Ficha de Imóvel — ${company}*\n\n`;
    text += `🏷️ *Código:* ${prop.code}\n`;
    text += `🏡 *Imóvel:* ${prop.title}\n`;
    text += `📍 *Região / Bairro:* ${prop.region}\n`;
    text += `🏠 *Tipo:* ${prop.property_type}\n`;
    
    if (prop.is_project) {
      text += `\n📐 *Tipologias & Unidades Disponíveis:*\n`;
      if (prop.typologies && prop.typologies.length > 0) {
        prop.typologies.forEach(typ => {
          const formattedTypPrice = typ.price ? formatCurrency(typ.price) : 'Sob consulta';
          const statusIcon = typ.status === 'Disponível' ? '🟢' : typ.status === 'Reservado' ? '🟡' : '🔴';
          text += `  • ${typ.name} (${typ.size}) ➔ *${formattedTypPrice}* ${statusIcon} ${typ.status}\n`;
        });
      } else {
        text += `  • Sob consulta (Tipologias sob demanda)\n`;
      }
    } else {
      const formattedPrice = prop.price ? formatCurrency(prop.price) : 'Sob consulta';
      text += `💰 *Valor de Venda:* *${formattedPrice}*\n`;
    }
    
    if (prop.photos_url) {
      text += `\n📂 *Fotos & Material:* ${prop.photos_url}\n`;
    }
    
    if (prop.notes) {
      text += `\n📝 *Observações:* "${prop.notes}"\n`;
    }
    
    text += `\n---\n`;
    text += `🤝 *Consultor Técnico:* ${realtor}\n`;
    if (realtorPhone) {
      text += `📞 *WhatsApp:* ${realtorPhone}\n`;
    }
    
    navigator.clipboard.writeText(text)
      .then(() => {
        alert('Ficha do imóvel copiada com sucesso! Pronta para colar no WhatsApp. 🚀');
      })
      .catch(err => {
        console.error('Erro ao copiar ficha:', err);
        alert('Erro ao copiar ficha automaticamente.');
      });
  };

  return (
    <div>
      {/* HEADER SECTION */}
      <div className="flex justify-between align-center" style={{ marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontFamily: 'Outfit, sans-serif', fontWeight: 700 }}>
            Carteira Digital de Imóveis (Beta) 🏢
          </h2>
          <p style={{ color: 'var(--gray-500)', fontSize: '13px', marginTop: '2px' }}>
            Gerencie suas captações de imóveis individuais e lançamentos de empreendimentos verticais.
          </p>
        </div>
        <button onClick={handleOpenAddModal} className="btn btn-primary" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
          <Plus size={18} />
          <span>Cadastrar Imóvel</span>
        </button>
      </div>

      {/* SEARCH AND FILTERS BAR */}
      <div className="search-filter-bar flex-col gap-2" style={{ display: 'flex', marginBottom: '24px' }}>
        <div className="search-input-wrapper">
          <Search size={16} />
          <input 
            type="text" 
            placeholder="Buscar por código, nome, bairro..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="filter-row no-scrollbar">
          <span style={{ fontSize: '13px', color: 'var(--gray-500)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
            <Filter size={14} /> Filtros:
          </span>
          
          {/* Project Filters */}
          <button 
            className={`badge ${projectFilter === 'all' ? 'badge-new' : 'badge-no_fit'}`}
            onClick={() => setProjectFilter('all')}
            style={{ border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            Todos ({properties.length})
          </button>
          <button 
            className={`badge ${projectFilter === 'individual' ? 'badge-new' : 'badge-no_fit'}`}
            onClick={() => setProjectFilter('individual')}
            style={{ border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            🏠 Avulsos / Prontos ({properties.filter(p => !p.is_project).length})
          </button>
          <button 
            className={`badge ${projectFilter === 'projects' ? 'badge-new' : 'badge-no_fit'}`}
            onClick={() => setProjectFilter('projects')}
            style={{ border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            🏢 Lançamentos / Empreendimentos ({properties.filter(p => p.is_project).length})
          </button>
        </div>

        <div className="filter-row no-scrollbar">
          <span style={{ fontSize: '13px', color: 'var(--gray-500)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
            <Layers size={14} /> Tipo de Imóvel:
          </span>
          <button 
            className={`badge ${typeFilter === '' ? 'badge-new' : 'badge-no_fit'}`}
            onClick={() => setTypeFilter('')}
            style={{ border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            Todos
          </button>
          {OPTIONS.PROPERTY_TYPES.map(type => {
            const count = properties.filter(p => p.property_type === type).length;
            return (
              <button 
                key={type}
                className={`badge ${typeFilter === type ? 'badge-new' : 'badge-no_fit'}`}
                onClick={() => setTypeFilter(typeFilter === type ? '' : type)}
                style={{ border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                {type} <span style={{ fontSize: '10px', fontWeight: 700, backgroundColor: 'rgba(0,0,0,0.08)', padding: '1px 5px', borderRadius: '8px', marginLeft: '4px' }}>{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* PROPERTIES LIST GRID */}
      {loading && properties.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--gray-400)' }}>Carregando carteira de imóveis...</div>
      ) : filteredProperties.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--gray-500)' }}>
          Nenhum imóvel cadastrado ou correspondente aos filtros.
        </div>
      ) : (
        <div className="grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          {filteredProperties.map((prop) => {
            return (
              <div 
                key={prop.id} 
                className="card" 
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '12px',
                  borderTop: prop.is_project ? '4px solid var(--primary)' : '4px solid var(--gray-300)',
                  position: 'relative'
                }}
              >
                {/* Badge de Lançamento */}
                {prop.is_project && (
                  <span style={{
                    position: 'absolute',
                    top: '12px',
                    right: '16px',
                    fontSize: '10px',
                    fontWeight: 700,
                    backgroundColor: 'var(--primary-light)',
                    color: 'var(--primary-dark)',
                    border: '1px solid rgba(197, 155, 39, 0.3)',
                    padding: '2px 8px',
                    borderRadius: '8px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    🏢 Lançamento
                  </span>
                )}

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ 
                      fontSize: '11px', 
                      fontWeight: 700, 
                      backgroundColor: 'rgba(0,0,0,0.06)', 
                      color: 'var(--gray-700)', 
                      padding: '2px 6px', 
                      borderRadius: '4px' 
                    }}>
                      {prop.code}
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--gray-500)' }}>
                      🏠 {prop.property_type}
                    </span>
                  </div>
                  
                  <h3 style={{ fontSize: '16px', fontWeight: 700, fontFamily: 'Outfit, sans-serif', color: 'var(--gray-900)', marginTop: '6px' }}>
                    {prop.title}
                  </h3>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: 'var(--gray-500)', marginTop: '4px' }}>
                    <MapPin size={12} /> {prop.region}
                  </div>
                </div>

                {/* Valor ou Tipologias */}
                <div style={{ 
                  backgroundColor: 'rgba(0,0,0,0.02)', 
                  padding: '10px 12px', 
                  borderRadius: 'var(--radius-sm)', 
                  border: '1px solid rgba(0,0,0,0.04)',
                  fontSize: '13px'
                }}>
                  {prop.is_project ? (
                    <div>
                      <span style={{ color: 'var(--gray-600)', fontWeight: 600 }}>📐 Metragens e Plantas:</span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '4px' }}>
                        {prop.typologies && prop.typologies.length > 0 ? (
                          prop.typologies.slice(0, 2).map((typ, idx) => (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                              <span>• {typ.name} ({typ.size})</span>
                              <span style={{ fontWeight: 600, color: 'var(--status-won)' }}>
                                {typ.price ? formatCurrency(typ.price) : 'Sob Consulta'}
                              </span>
                            </div>
                          ))
                        ) : (
                          <span style={{ fontSize: '11px', color: 'var(--gray-400)', fontStyle: 'italic' }}>Nenhuma planta cadastrada ainda.</span>
                        )}
                        {prop.typologies && prop.typologies.length > 2 && (
                          <span style={{ fontSize: '10px', color: 'var(--primary)', fontWeight: 600, marginTop: '2px' }}>
                            + {prop.typologies.length - 2} opções de plantas
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--gray-600)', fontWeight: 600 }}>💰 Preço de Venda:</span>
                      <span style={{ fontWeight: 800, color: 'var(--primary-dark)', fontSize: '15px' }}>
                        {prop.price ? formatCurrency(prop.price) : 'Sob Consulta'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Proprietário Box (Collapsible / Private to Realtor) */}
                <div style={{ 
                  borderTop: '1px dashed var(--gray-200)', 
                  paddingTop: '8px', 
                  fontSize: '11px', 
                  color: 'var(--gray-500)',
                  display: 'flex',
                  justifyContent: 'space-between'
                }}>
                  <span>Captação: {prop.commission_rate}% comissão</span>
                  {prop.owner_name && (
                    <span title={`Proprietário: ${prop.owner_name} | Contato: ${prop.owner_phone || 'Não informado'}`}>
                      👤 Dono: {prop.owner_name.substring(0, 10)}...
                    </span>
                  )}
                </div>

                {/* CARD ACTIONS */}
                <div className="mobile-card-actions" style={{ marginTop: 'auto', paddingTop: '8px' }}>
                  <button 
                    onClick={() => handleCopyPropertySummary(prop)} 
                    className="action-btn"
                    style={{ 
                      flex: '1 1 auto', 
                      backgroundColor: 'rgba(197, 155, 39, 0.08)', 
                      color: 'var(--primary-dark)', 
                      borderColor: 'rgba(197, 155, 39, 0.2)',
                      fontWeight: 600
                    }}
                  >
                    <Copy size={13} />
                    <span>Copiar Ficha</span>
                  </button>

                  <div style={{ display: 'flex', gap: '6px', marginLeft: 'auto' }}>
                    {prop.photos_url && (
                      <a 
                        href={prop.photos_url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="action-btn"
                        style={{ width: '36px', height: '36px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        title="Ver Fotos / Drive"
                      >
                        <ExternalLink size={13} />
                      </a>
                    )}
                    <button 
                      onClick={() => handleOpenEditModal(prop)} 
                      className="action-btn"
                      style={{ width: '36px', height: '36px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      title="Editar Imóvel"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button 
                      onClick={() => handleDeleteProperty(prop)} 
                      className="action-btn"
                      style={{ width: '36px', height: '36px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--status-lost)', borderColor: 'rgba(239, 68, 68, 0.1)' }}
                      title="Excluir Imóvel"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ADD / EDIT PROPERTY FORM MODAL */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingProperty ? 'Editar Captação de Imóvel' : 'Cadastrar Captação na Carteira'}
      >
        <form onSubmit={handleSubmit}>
          
          {/* GENERAL INFO */}
          <div style={{ marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
            <h4 style={{ fontSize: '13px', textTransform: 'uppercase', color: 'var(--primary)', fontWeight: 700, letterSpacing: '0.5px', marginBottom: '12px' }}>
              🏡 Dados Gerais da Captação
            </h4>
            
            <div className="form-row">
              <div className="form-group">
                <label>Código do Imóvel *</label>
                <input 
                  type="text" 
                  name="code" 
                  value={formData.code} 
                  onChange={handleInputChange} 
                  placeholder="Ex: AP202, CA05, TR08"
                  required
                />
              </div>
              <div className="form-group">
                <label>Título / Nome Residencial *</label>
                <input 
                  type="text" 
                  name="title" 
                  value={formData.title} 
                  onChange={handleInputChange} 
                  placeholder="Ex: Sobrado Mobiliado Villaggio"
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Tipo de Imóvel</label>
                <select name="property_type" value={formData.property_type} onChange={handleInputChange}>
                  {OPTIONS.PROPERTY_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Bairro / Região *</label>
                <input 
                  type="text" 
                  name="region" 
                  value={formData.region} 
                  onChange={handleInputChange} 
                  placeholder="Ex: Jardim Botânico"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Link da Pasta de Fotos (Google Drive / Dropbox)</label>
              <input 
                type="url" 
                name="photos_url" 
                value={formData.photos_url} 
                onChange={handleInputChange} 
                placeholder="Ex: https://drive.google.com/drive/folders/..."
              />
            </div>
          </div>

          {/* PROJECT VS INDIVIDUAL TOGGLE */}
          <div style={{ 
            backgroundColor: 'rgba(0,0,0,0.01)', 
            border: '1px solid var(--border-color)', 
            borderRadius: 'var(--radius-md)', 
            padding: '16px',
            marginBottom: '16px' 
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--gray-900)', display: 'block', margin: 0 }}>
                  🏢 Este imóvel é um Empreendimento / Lançamento?
                </label>
                <span style={{ fontSize: '11px', color: 'var(--gray-400)' }}>
                  Ative se possuir múltiplos tamanhos, plantas e opções de preço de tabela.
                </span>
              </div>
              <input 
                type="checkbox" 
                name="is_project" 
                checked={formData.is_project} 
                onChange={handleInputChange}
                style={{ width: '20px', height: '20px', cursor: 'pointer' }}
              />
            </div>

            {/* IF IS AN INDIVIDUAL PROPERTY: PRICE INPUT */}
            {!formData.is_project && (
              <div className="form-row" style={{ marginTop: '16px', marginBottom: 0 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Valor de Venda (R$)</label>
                  <input 
                    type="number" 
                    name="price" 
                    value={formData.price} 
                    onChange={handleInputChange} 
                    placeholder="Ex: 1250000"
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Taxa de Comissão Combinada (%)</label>
                  <input 
                    type="number" 
                    name="commission_rate" 
                    value={formData.commission_rate} 
                    onChange={handleInputChange} 
                    placeholder="Ex: 5"
                    step="0.01"
                  />
                </div>
              </div>
            )}

            {/* IF IS A PROJECT: TYPOLOGY MANAGER */}
            {formData.is_project && (
              <div style={{ marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                <label style={{ color: 'var(--primary-dark)', fontWeight: 700, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  📐 Plantas & Metragens Disponíveis no Prédio
                </label>
                
                {/* List registered typologies */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px', marginBottom: '16px' }}>
                  {typologies.length === 0 ? (
                    <div style={{ fontSize: '11px', color: 'var(--gray-400)', fontStyle: 'italic', padding: '6px', textAlign: 'center' }}>
                      Nenhuma planta registrada. Adicione pelo menos uma tipologia abaixo.
                    </div>
                  ) : (
                    typologies.map((typ, idx) => (
                      <div 
                        key={idx} 
                        style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center', 
                          padding: '6px 12px', 
                          backgroundColor: '#fff', 
                          border: '1px solid var(--border-color)', 
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '12px'
                        }}
                      >
                        <div>
                          <strong>{typ.name}</strong> ({typ.size}) ➔ <span style={{ color: 'var(--status-won)', fontWeight: 600 }}>{typ.price ? formatCurrency(typ.price) : 'Sob Consulta'}</span>
                          <span style={{ 
                            fontSize: '9px', 
                            padding: '1px 5px', 
                            borderRadius: '8px', 
                            backgroundColor: typ.status === 'Disponível' ? 'var(--status-won-bg)' : typ.status === 'Reservado' ? 'rgba(245, 158, 11, 0.1)' : 'var(--status-lost-bg)',
                            color: typ.status === 'Disponível' ? 'var(--status-won)' : typ.status === 'Reservado' ? '#f59e0b' : 'var(--status-lost)',
                            marginLeft: '6px'
                          }}>
                            {typ.status}
                          </span>
                        </div>
                        <button 
                          type="button" 
                          onClick={() => handleRemoveTypology(idx)}
                          style={{ color: 'var(--status-lost)' }}
                          title="Remover planta"
                        >
                          <Trash size={14} />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Add typology sub-form */}
                <div style={{ 
                  padding: '12px', 
                  backgroundColor: 'rgba(0,0,0,0.01)', 
                  border: '1px dashed var(--gray-300)', 
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '12px'
                }}>
                  <div className="form-row">
                    <div className="form-group" style={{ marginBottom: '8px' }}>
                      <label style={{ fontSize: '11px' }}>Nome da Planta / Tipologia *</label>
                      <input 
                        type="text" 
                        name="name" 
                        value={newTypology.name} 
                        onChange={handleTypologyChange} 
                        placeholder="Ex: 2 Quartos (Suíte)" 
                        style={{ height: '32px', fontSize: '12px', padding: '0 8px' }}
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: '8px' }}>
                      <label style={{ fontSize: '11px' }}>Metragem / Área M² *</label>
                      <input 
                        type="text" 
                        name="size" 
                        value={newTypology.size} 
                        onChange={handleTypologyChange} 
                        placeholder="Ex: 64m²" 
                        style={{ height: '32px', fontSize: '12px', padding: '0 8px' }}
                      />
                    </div>
                  </div>
                  <div className="form-row" style={{ marginTop: '4px', marginBottom: 0 }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: '11px' }}>Preço de Tabela (R$)</label>
                      <input 
                        type="number" 
                        name="price" 
                        value={newTypology.price} 
                        onChange={handleTypologyChange} 
                        placeholder="Ex: 420000" 
                        style={{ height: '32px', fontSize: '12px', padding: '0 8px' }}
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: '11px' }}>Disponibilidade</label>
                      <select 
                        name="status" 
                        value={newTypology.status} 
                        onChange={handleTypologyChange}
                        style={{ height: '32px', fontSize: '12px', padding: '0 8px' }}
                      >
                        <option value="Disponível">Disponível</option>
                        <option value="Reservado">Reservado</option>
                        <option value="Vendido">Vendido</option>
                      </select>
                    </div>
                  </div>
                  <button 
                    type="button" 
                    onClick={handleAddTypology} 
                    className="btn btn-outline"
                    style={{ width: '100%', height: '32px', marginTop: '10px', fontSize: '11px', fontWeight: 600, display: 'flex', gap: '4px' }}
                  >
                    <Plus size={12} /> Incluir Planta na Lista
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* CAPTURE DETAILS (OWNER) - Private */}
          <div style={{ marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
            <h4 style={{ fontSize: '13px', textTransform: 'uppercase', color: 'var(--primary)', fontWeight: 700, letterSpacing: '0.5px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              👤 Informações da Captação (Privado do Corretor)
            </h4>
            
            <div className="form-row">
              <div className="form-group">
                <label>Nome do Proprietário / Construtora</label>
                <input 
                  type="text" 
                  name="owner_name" 
                  value={formData.owner_name} 
                  onChange={handleInputChange} 
                  placeholder="Ex: Bruno Ferreira"
                />
              </div>
              <div className="form-group">
                <label>Telefone / WhatsApp do Proprietário</label>
                <input 
                  type="tel" 
                  name="owner_phone" 
                  value={formData.owner_phone} 
                  onChange={handleInputChange} 
                  placeholder="Ex: 11988885555"
                />
              </div>
            </div>
          </div>

          {/* ADDITIONAL NOTES */}
          <div className="form-group">
            <label>Descrição / Observações Técnicas</label>
            <textarea 
              name="notes" 
              value={formData.notes} 
              onChange={handleInputChange} 
              placeholder="Ex: Aceita permuta de menor valor, face sombra, condomínio incluso lazer completo..."
              rows={3}
            />
          </div>

          <button type="submit" disabled={loading} className="btn btn-primary btn-large" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <Save size={18} />
            <span>{loading ? 'Salvando...' : (editingProperty ? 'Salvar Alterações' : 'Cadastrar Imóvel na Carteira')}</span>
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default Properties;
