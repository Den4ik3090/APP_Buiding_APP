import React, { useState, useEffect } from 'react';
import { ADDITIONAL_TRAINING_TYPES } from '../utils/constants';
import { supabase } from '../supabaseClient';

function EmployeeForm({
  onAddEmployee,
  editingEmployee,
  onUpdateEmployee,
  onCancelEdit,
  existingOrganizations = [],
  onPhotoUpload,
  onPhotoError,
}) {
  const [activeTab, setActiveTab] = useState('general');
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    profession: '',
    birthDate: '',
    trainingDate: '',
    responsible: '',
    comment: '',
    photo_url: '',
    organization: '',
    additionalTrainings: [],
  });

  const [errors, setErrors] = useState({});

  // Валидация формы
  const validateForm = () => {
    const newErrors = {};

    if (!formData.name?.trim()) {
      newErrors.name = 'ФИО обязательно';
    }

    if (!formData.profession?.trim()) {
      newErrors.profession = 'Должность обязательна';
    }

    if (!formData.trainingDate) {
      newErrors.trainingDate = 'Дата инструктажа обязательна';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePhotoUpload = async (e) => {
    try {
      setUploading(true);
      if (!e.target.files || e.target.files.length === 0) return;

      const file = e.target.files[0];

      // Валидация размера файла (макс 5MB)
      if (file.size > 5 * 1024 * 1024) {
        onPhotoError?.(new Error('Размер файла не должен превышать 5MB'));
        return;
      }

      // Валидация типа файла
      if (!file.type.startsWith('image/')) {
        onPhotoError?.(new Error('Пожалуйста, выберите изображение'));
        return;
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      let { error: uploadError } = await supabase.storage
        .from('employee-photos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('employee-photos').getPublicUrl(filePath);

      setFormData((prev) => ({
        ...prev,
        photo_url: data.publicUrl,
      }));

      onPhotoUpload?.();
    } catch (error) {
      console.error('Ошибка загрузки:', error);
      onPhotoError?.(error);
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    if (editingEmployee) {
      setFormData(editingEmployee);
      setErrors({});
    } else {
      setFormData({
        name: '',
        profession: '',
        birthDate: '',
        trainingDate: '',
        responsible: '',
        comment: '',
        photo_url: '',
        organization: '',
        additionalTrainings: [],
      });
      setErrors({});
    }
  }, [editingEmployee]);

  const checkTrainingStatus = (dateReceived, months) => {
    if (!dateReceived || !months) return { isExpired: false, daysLeft: 0 };
    const start = new Date(dateReceived);
    const expiryDate = new Date(start.setMonth(start.getMonth() + parseInt(months)));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysLeft = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
    return { isExpired: daysLeft <= 0, daysLeft };
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Очистить ошибку при изменении поля
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const handleAddNewOrg = () => {
    const newOrg = prompt('Введите название новой организации:');
    if (newOrg && newOrg.trim() !== '') {
      setFormData((prev) => ({
        ...prev,
        organization: newOrg.trim(),
      }));
    }
  };

  // Логика дополнительного обучения
  const addTrainingRow = () => {
    const newTraining = {
      id: Date.now(),
      type: ADDITIONAL_TRAINING_TYPES[0] || 'Прочее',
      dateReceived: new Date().toISOString().split('T')[0],
      expiryMonths: 12,
    };
    setFormData((prev) => ({
      ...prev,
      additionalTrainings: [...prev.additionalTrainings, newTraining],
    }));
  };

  const removeTrainingRow = (id) => {
    setFormData((prev) => ({
      ...prev,
      additionalTrainings: prev.additionalTrainings.filter((t) => t.id !== id),
    }));
  };

  const updateTrainingRow = (id, field, value) => {
    setFormData((prev) => ({
      ...prev,
      additionalTrainings: prev.additionalTrainings.map((t) =>
        t.id === id ? { ...t, [field]: value } : t
      ),
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (editingEmployee) {
      onUpdateEmployee(formData);
    } else {
      onAddEmployee(formData);
    }
  };

  const hasExpiredInList = formData.additionalTrainings.some(
    (t) => checkTrainingStatus(t.dateReceived, t.expiryMonths).isExpired
  );

  return (
    <div className="modal-overlay" onClick={onCancelEdit}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{editingEmployee ? '✏️ Редактирование' : '➕ Новый сотрудник'}</h2>
          <button className="close__modal" onClick={onCancelEdit}>
            ✕
          </button>
        </div>

        <div className="tabs-header">
          <button
            className={`tab-btn ${activeTab === 'general' ? 'active' : ''}`}
            onClick={() => setActiveTab('general')}
          >
            📋 Основная информация
          </button>
          <button
            className={`tab-btn ${activeTab === 'trainings' ? 'active' : ''}`}
            onClick={() => setActiveTab('trainings')}
          >
            📚 Дополнительное обучение
            {hasExpiredInList && <span className="tab-warning-dot">!</span>}
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* TAB 1: General Info */}
          {activeTab === 'general' && (
            <>
              {/* Photo Section */}
              <div className="photo-section">
                <div className="photo-preview">
                  {formData.photo_url ? (
                    <img src={formData.photo_url} alt="Preview" />
                  ) : (
                    <span style={{ fontSize: '2rem' }}>📷</span>
                  )}
                </div>
                <label htmlFor="photo-input" className="photo-upload-label">
                  {uploading ? 'Загрузка...' : 'Изменить фото'}
                </label>
                <input
                  id="photo-input"
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  disabled={uploading}
                  style={{ display: 'none' }}
                />
              </div>

              <div className="form-grid">
                <div className="input-group">
                  <label>ФИО *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Иван Петров"
                    className={errors.name ? 'input-error' : ''}
                  />
                  {errors.name && <span className="error-message">{errors.name}</span>}
                </div>

                <div className="input-group">
                  <label>Должность *</label>
                  <input
                    type="text"
                    name="profession"
                    value={formData.profession}
                    onChange={handleChange}
                    placeholder="Инженер"
                    className={errors.profession ? 'input-error' : ''}
                  />
                  {errors.profession && <span className="error-message">{errors.profession}</span>}
                </div>

                <div className="input-group">
                  <label>Дата рождения</label>
                  <input
                    type="date"
                    name="birthDate"
                    value={formData.birthDate}
                    onChange={handleChange}
                  />
                </div>

                <div className="input-group">
                  <label>Дата инструктажа *</label>
                  <input
                    type="date"
                    name="trainingDate"
                    value={formData.trainingDate}
                    onChange={handleChange}
                    className={errors.trainingDate ? 'input-error' : ''}
                  />
                  {errors.trainingDate && (
                    <span className="error-message">{errors.trainingDate}</span>
                  )}
                </div>

                <div className="input-group">
                  <label>Ответственное лицо</label>
                  <input
                    type="text"
                    name="responsible"
                    value={formData.responsible}
                    onChange={handleChange}
                    placeholder="ФИО"
                  />
                </div>

                <div className="input-group">
                  <label>Организация</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <select
                      name="organization"
                      value={formData.organization}
                      onChange={handleChange}
                    >
                      <option value="">-- Выбрать --</option>
                      {existingOrganizations.map((org, idx) => (
                        <option key={`${org}-${idx}`} value={org}>
                          {org}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleAddNewOrg}
                      style={{
                        padding: '10px 15px',
                        background: '#f0f0f0',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                      }}
                      title="Добавить новую организацию"
                    >
                      ➕
                    </button>
                  </div>
                </div>
              </div>

              <div className="input-group">
                <label>Комментарий</label>
                <textarea
                  name="comment"
                  value={formData.comment}
                  onChange={handleChange}
                  placeholder="Дополнительная информация"
                  style={{ minHeight: '100px' }}
                />
              </div>
            </>
          )}

          {/* TAB 2: Additional Trainings */}
          {activeTab === 'trainings' && (
            <div className="trainings-section">
              <button
                type="button"
                onClick={addTrainingRow}
                className="btn-add-row"
                style={{ marginBottom: '20px' }}
              >
                + Добавить обучение
              </button>

              {formData.additionalTrainings.length > 0 ? (
                <table className="sub-table">
                  <thead>
                    <tr>
                      <th>Тип обучения</th>
                      <th>Дата получения</th>
                      <th>Действительно (месяцев)</th>
                      <th>Статус</th>
                      <th>Действие</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.additionalTrainings.map((training) => {
                      const { isExpired, daysLeft } = checkTrainingStatus(
                        training.dateReceived,
                        training.expiryMonths
                      );
                      return (
                        <tr key={training.id} className={isExpired ? 'row-expired-bg' : ''}>
                          <td>
                            <select
                              value={training.type}
                              onChange={(e) =>
                                updateTrainingRow(training.id, 'type', e.target.value)
                              }
                              style={{ width: '100%' }}
                            >
                              {ADDITIONAL_TRAINING_TYPES.map((type, idx) => (
                                <option key={`${type}-${idx}`} value={type}>
                                  {type}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <input
                              type="date"
                              value={training.dateReceived}
                              onChange={(e) =>
                                updateTrainingRow(training.id, 'dateReceived', e.target.value)
                              }
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              value={training.expiryMonths}
                              onChange={(e) =>
                                updateTrainingRow(training.id, 'expiryMonths', e.target.value)
                              }
                              min="1"
                              style={{ width: '80px' }}
                            />
                          </td>
                          <td className="status-cell">
                            {isExpired ? (
                              <span className="text-red">❌ Истекло ({daysLeft})</span>
                            ) : daysLeft <= 30 ? (
                              <span className="text-orange">⚠️ Скоро ({daysLeft})</span>
                            ) : (
                              <span className="text-green">✅ Актуально ({daysLeft})</span>
                            )}
                          </td>
                          <td>
                            <button
                              type="button"
                              onClick={() => removeTrainingRow(training.id)}
                              style={{
                                background: '#ff6b6b',
                                color: 'white',
                                border: 'none',
                                padding: '6px 12px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                              }}
                            >
                              🗑️
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <p style={{ textAlign: 'center', color: '#999' }}>
                  Нет добавленных обучений. Нажмите кнопку выше для добавления.
                </p>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="modal-footer">
            <button type="button" className="btn-danger" onClick={onCancelEdit}>
              Отмена
            </button>
            <button type="submit" className="btn-primary">
              {editingEmployee ? '💾 Сохранить' : '✅ Добавить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EmployeeForm;
