import React, { useState, useEffect } from 'react';
import { MessageSquare, Plus, Edit2, Trash2, Info, Code } from 'lucide-react';
import { supabase } from '../config/supabase';
import Modal from './UI/Modal';

const WhatsAppTemplates = ({ user }) => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);

  // Form Fields
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    text_content: ''
  });

  const availableTags = [
    { tag: '{nome}', desc: 'Nome do lead' },
    { tag: '{imovel}', desc: 'Tipo do imóvel' },
    { tag: '{regiao}', desc: 'Bairro/Região' },
    { tag: '{valor}', desc: 'Orçamento do lead' },
    { tag: '{corretor}', desc: 'Seu nome' },
    { tag: '{data_visita}', desc: 'Data da visita' },
    { tag: '{hora_visita}', desc: 'Hora da visita' }
  ];

  useEffect(() => {
    fetchTemplates();
  }, [user]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('whatsapp_templates')
        .select('*');
        
      if (error) throw error;

      if ((!data || data.length === 0) && user?.id) {
        // Safe auto-backfill for existing accounts or mock database
        const defaults = [
          {
            owner_id: user.id,
            title: 'Apresentação e Primeiro Contato 🏠',
            description: 'Mensagem de boas-vindas logo após o lead demonstrar interesse.',
            text_content: 'Olá, {nome}! Tudo bem? Sou o/a {corretor}, especialista de imóveis da Loreny Imóveis. 🙋‍♀️' + '\n\n' + 'Vi que você está buscando um(a) {imovel} na região de {regiao} na faixa de orçamento de {valor}. Tenho algumas opções excelentes selecionadas para o seu perfil. Podermos conversar por ligação rápida de 3 minutos hoje às 17h?'
          },
          {
            owner_id: user.id,
            title: 'Confirmação de Visitação 🗓️',
            description: 'Para enviar um dia antes ou horas antes da visita agendada.',
            text_content: 'Olá, {nome}! Tudo certo para nossa visita de amanhã? 🚀' + '\n\n' + 'Ficou agendado para o dia {data_visita} às {hora_visita} no imóvel {imovel}.' + '\n\n' + 'Endereço ou Ponto de encontro: {regiao}.' + '\n\n' + 'Caso tenha algum imprevisto, me avise por aqui! Abraços!'
          },
          {
            owner_id: user.id,
            title: 'Acompanhamento de Proposta 📝',
            description: 'Follow-up de negociação para destravar propostas pendentes.',
            text_content: 'Olá, {nome}! Tudo bem?' + '\n\n' + 'Passando para saber se teve a oportunidade de avaliar a proposta de {valor} enviada para o imóvel em {regiao}. O proprietário demonstrou abertura, mas precisamos formalizar os termos. Ficamos no aguardo de sua resposta para fecharmos esse excelente negócio! ✨'
          }
        ];

        await supabase.from('whatsapp_templates').insert(defaults);
        const { data: refetched } = await supabase.from('whatsapp_templates').select('*');
        setTemplates(refetched || []);
      } else {
        setTemplates(data || []);
      }
    } catch (e) {
      console.error('Erro ao buscar templates:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingTemplate(null);
    setFormData({
      title: '',
      description: '',
      text_content: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (tpl) => {
    setEditingTemplate(tpl);
    setFormData({
      title: tpl.title,
      description: tpl.description || '',
      text_content: tpl.text_content
    });
    setIsModalOpen(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Inject tag into the textarea at the cursor position
  const injectTag = (tag) => {
    const textarea = document.getElementById('template_text_area');
    if (!textarea) return;

    const startPos = textarea.selectionStart;
    const endPos = textarea.selectionEnd;
    const currentText = formData.text_content;

    const newText = 
      currentText.substring(0, startPos) + 
      tag + 
      currentText.substring(endPos, currentText.length);

    setFormData(prev => ({ ...prev, text_content: newText }));

    // Refocus and place cursor after tag
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = startPos + tag.length;
      textarea.selectionEnd = startPos + tag.length;
    }, 10);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title || !formData.text_content) {
      alert('Por favor, preencha o Título e o Conteúdo da Mensagem.');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        ...formData,
        owner_id: user.id
      };

      if (editingTemplate) {
        const { error } = await supabase
          .from('whatsapp_templates')
          .update(payload)
          .eq('id', editingTemplate.id);
          
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('whatsapp_templates')
          .insert(payload);
          
        if (error) throw error;
      }

      setIsModalOpen(false);
      fetchTemplates();
    } catch (err) {
      alert('Erro ao salvar template: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTemplate = async (tpl) => {
    const confirmDelete = window.confirm(`Deseja realmente excluir o modelo "${tpl.title}"?`);
    if (!confirmDelete) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from('whatsapp_templates')
        .delete()
        .eq('id', tpl.id);

      if (error) throw error;
      alert('Modelo excluído com sucesso.');
      fetchTemplates();
    } catch (err) {
      alert('Erro ao excluir modelo: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between align-center" style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '20px', fontFamily: 'Outfit, sans-serif', fontWeight: 700 }}>
          Modelos de Mensagem do WhatsApp
        </h2>
        <button onClick={handleOpenAddModal} className="btn btn-primary" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
          <Plus size={18} />
          <span>Novo Modelo</span>
        </button>
      </div>

      <div className="glass-card" style={{ marginBottom: '24px', padding: '16px', display: 'flex', gap: '10px', alignItems: 'flex-start', border: '1px solid rgba(16, 185, 129, 0.15)' }}>
        <Info size={20} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: '2px' }} />
        <div style={{ fontSize: '13px', color: 'var(--gray-500)', lineHeight: '1.5' }}>
          <strong>Como funcionam as tags:</strong> Ao escrever suas mensagens pré-definidas, utilize as tags como <code>{`{nome}`}</code> ou <code>{`{imovel}`}</code>. Ao clicar para enviar pelo WhatsApp na lista de leads, o CRM substituirá automaticamente as tags pelos dados reais daquele cliente em tempo real!
        </div>
      </div>

      {loading && templates.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--gray-400)' }}>Carregando seus modelos...</div>
      ) : templates.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--gray-500)' }}>
          Nenhum modelo de mensagem cadastrado. Clique em "Novo Modelo" para criar modelos rápidos de apresentação, confirmação de visitas ou cobranças.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))' }}>
          {templates.map((tpl) => (
            <div key={tpl.id} className="card flex-col" style={{ display: 'flex', justifyContent: 'space-between', height: '100%' }}>
              <div>
                <div className="flex align-center justify-between" style={{ marginBottom: '10px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 600, fontFamily: 'Outfit, sans-serif', color: 'var(--gray-900)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MessageSquare size={16} style={{ color: 'var(--primary-dark)' }} />
                    {tpl.title}
                  </h3>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button 
                      onClick={() => handleOpenEditModal(tpl)} 
                      className="tab-btn" 
                      style={{ padding: '6px', borderRadius: '4px', cursor: 'pointer', color: 'var(--gray-600)' }}
                    >
                      <Edit2 size={13} />
                    </button>
                    <button 
                      onClick={() => handleDeleteTemplate(tpl)} 
                      className="tab-btn" 
                      style={{ padding: '6px', borderRadius: '4px', cursor: 'pointer', color: 'var(--status-lost)' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {tpl.description && (
                  <p style={{ fontSize: '12px', color: 'var(--gray-600)', marginBottom: '12px', fontStyle: 'italic' }}>
                    💡 {tpl.description}
                  </p>
                )}

                <div style={{ 
                  backgroundColor: 'rgba(0, 0, 0, 0.02)', 
                  padding: '12px', 
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '13px',
                  color: 'var(--gray-800)',
                  lineHeight: '1.6',
                  whiteSpace: 'pre-wrap',
                  border: '1px solid rgba(0,0,0,0.05)'
                }}>
                  {tpl.text_content}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TEMPLATE CREATION / EDITING MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTemplate ? 'Editar Modelo WhatsApp' : 'Criar Novo Modelo WhatsApp'}
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Título do Modelo *</label>
            <input 
              type="text" 
              name="title" 
              value={formData.title} 
              onChange={handleInputChange} 
              placeholder="Ex: Confirmação de Visita Técnica 🏠"
              required 
            />
          </div>

          <div className="form-group">
            <label>Descrição de uso (opcional)</label>
            <input 
              type="text" 
              name="description" 
              value={formData.description} 
              onChange={handleInputChange} 
              placeholder="Ex: Enviar um dia antes de visitar o imóvel"
            />
          </div>

          <div className="form-group" style={{ marginBottom: '8px' }}>
            <label style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
              <span>Conteúdo da Mensagem *</span>
              <span style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}>
                <Code size={12} /> Clique nas tags para injetar no texto
              </span>
            </label>
            
            {/* INJECTABLE TAGS BAR */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px', padding: '8px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.04)' }}>
              {availableTags.map(tagObj => (
                <button
                  key={tagObj.tag}
                  type="button"
                  onClick={() => injectTag(tagObj.tag)}
                  style={{ 
                    fontSize: '11px', 
                    padding: '4px 8px', 
                    borderRadius: '4px', 
                    backgroundColor: 'rgba(16, 185, 129, 0.08)', 
                    color: 'var(--primary)', 
                    border: '1px solid rgba(16, 185, 129, 0.15)',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                  title={tagObj.desc}
                >
                  {tagObj.tag}
                </button>
              ))}
            </div>

            <textarea 
              id="template_text_area"
              name="text_content" 
              value={formData.text_content} 
              onChange={handleInputChange} 
              placeholder="Ex: Olá, {nome}! Confirmando nossa visita ao imóvel {imovel} amanhã..."
              rows={8}
              required
              style={{ lineHeight: '1.6', fontFamily: 'sans-serif' }}
            />
          </div>

          <button type="submit" disabled={loading} className="btn btn-primary btn-large">
            {loading ? 'Salvando...' : editingTemplate ? 'Salvar Alterações' : 'Criar Modelo'}
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default WhatsAppTemplates;
