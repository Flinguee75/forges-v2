import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import ApprenantCreate from '../ApprenantCreate';
import { apprenantsApi } from '../../../../api/apprenants.api';
import { organisationsApi } from '../../../../api/organisations.api';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../../../../api/apprenants.api', () => ({
  apprenantsApi: { create: vi.fn() },
}));

vi.mock('../../../../api/organisations.api', () => ({
  organisationsApi: { getAll: vi.fn() },
}));

const state = vi.hoisted(() => ({
  showToast: vi.fn(),
  execute: vi.fn(async (apiCall, options) => {
    try {
      const result = await apiCall();
      await options?.onSuccess?.(result);
      return result;
    } catch (err) {
      await options?.onError?.(err);
    }
  }),
  isLoading: false,
}));

vi.mock('../../../../hooks/useToast', () => ({
  useToast: () => ({ showToast: state.showToast }),
}));

vi.mock('../../../../hooks/useApi', () => ({
  useApi: () => ({ execute: state.execute, isLoading: state.isLoading }),
}));

function renderComponent() {
  return render(
    <BrowserRouter>
      <ApprenantCreate />
    </BrowserRouter>
  );
}

describe('ApprenantCreate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    organisationsApi.getAll.mockResolvedValue({ data: { data: [] } });
  });

  it('affiche le formulaire de creation', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByTestId('form-creer-apprenant')).toBeInTheDocument();
    });
    expect(screen.getByTestId('input-nom')).toBeInTheDocument();
    expect(screen.getByTestId('input-prenoms')).toBeInTheDocument();
    expect(screen.getByTestId('input-email')).toBeInTheDocument();
    expect(screen.getByTestId('btn-submit')).toBeInTheDocument();
  });

  it('affiche les erreurs de validation si champs vides', async () => {
    renderComponent();
    await waitFor(() => screen.getByTestId('form-creer-apprenant'));
    fireEvent.submit(screen.getByTestId('form-creer-apprenant'));
    await waitFor(() => {
      expect(screen.getByText('Nom obligatoire')).toBeInTheDocument();
      expect(screen.getByText('Prenoms obligatoires')).toBeInTheDocument();
      expect(screen.getByText('Email obligatoire')).toBeInTheDocument();
    });
  });

  it('affiche champ secteur pour PROFESSIONNEL', async () => {
    renderComponent();
    await waitFor(() => screen.getByTestId('form-creer-apprenant'));
    expect(screen.getByTestId('input-secteur')).toBeInTheDocument();
    expect(screen.queryByTestId('input-niveau')).not.toBeInTheDocument();
  });

  it('affiche champ niveau etude pour APPRENANT', async () => {
    const user = userEvent.setup();
    renderComponent();
    await waitFor(() => screen.getByTestId('form-creer-apprenant'));
    await user.selectOptions(screen.getByTestId('select-type'), 'APPRENANT');
    expect(screen.getByTestId('input-niveau')).toBeInTheDocument();
    expect(screen.queryByTestId('input-secteur')).not.toBeInTheDocument();
  });

  it('affiche validation: secteur obligatoire pour PROFESSIONNEL', async () => {
    const user = userEvent.setup();
    renderComponent();
    await waitFor(() => screen.getByTestId('form-creer-apprenant'));
    await user.type(screen.getByTestId('input-nom'), 'Konan');
    await user.type(screen.getByTestId('input-prenoms'), 'Elie');
    await user.type(screen.getByTestId('input-email'), 'konan@test.ci');
    fireEvent.submit(screen.getByTestId('form-creer-apprenant'));
    await waitFor(() => {
      expect(screen.getByText('Secteur obligatoire pour un professionnel')).toBeInTheDocument();
    });
  });

  it('soumet le formulaire et affiche les credentials en cas de succes', async () => {
    const user = userEvent.setup();
    apprenantsApi.create.mockResolvedValue({
      data: {
        id: 'abc-123',
        email: 'konan@test.ci',
        mot_de_passe_temp: 'MotDePasse1!',
        statut: 'ACTIF',
      },
    });
    renderComponent();
    await waitFor(() => screen.getByTestId('form-creer-apprenant'));
    await user.type(screen.getByTestId('input-nom'), 'Konan');
    await user.type(screen.getByTestId('input-prenoms'), 'Elie');
    await user.type(screen.getByTestId('input-email'), 'konan@test.ci');
    await user.type(screen.getByTestId('input-secteur'), 'Securite');
    fireEvent.submit(screen.getByTestId('form-creer-apprenant'));
    await waitFor(() => {
      expect(screen.getByTestId('success-title')).toBeInTheDocument();
      expect(screen.getByTestId('credentials-email')).toHaveTextContent('konan@test.ci');
      expect(screen.getByTestId('credentials-password')).toHaveTextContent('MotDePasse1!');
    });
    expect(state.showToast).toHaveBeenCalledWith('Compte apprenant cree avec succes.', 'success');
  });

  it('affiche erreur email deja utilise → EMAIL_ALREADY_EXISTS', async () => {
    const user = userEvent.setup();
    const err = { response: { data: { error: 'EMAIL_ALREADY_EXISTS' } } };
    state.execute.mockImplementationOnce(async (_apiCall, options) => {
      await options?.onError?.(err);
    });
    renderComponent();
    await waitFor(() => screen.getByTestId('form-creer-apprenant'));
    await user.type(screen.getByTestId('input-nom'), 'Konan');
    await user.type(screen.getByTestId('input-prenoms'), 'Elie');
    await user.type(screen.getByTestId('input-email'), 'existing@test.ci');
    await user.type(screen.getByTestId('input-secteur'), 'Finance');
    fireEvent.submit(screen.getByTestId('form-creer-apprenant'));
    await waitFor(() => {
      expect(screen.getByText('Cet email est deja utilise')).toBeInTheDocument();
    });
  });

  it('affiche erreur organisation introuvable → ORGANISATION_NOT_FOUND', async () => {
    const user = userEvent.setup();
    const err = { response: { data: { error: 'ORGANISATION_NOT_FOUND' } } };
    organisationsApi.getAll.mockResolvedValue({
      data: { data: [{ id: 'org-1', raison_sociale: 'ANSSI' }] },
    });
    state.execute.mockImplementationOnce(async (_apiCall, options) => {
      await options?.onError?.(err);
    });
    renderComponent();
    await waitFor(() => screen.getByTestId('select-organisation'));
    await user.type(screen.getByTestId('input-nom'), 'Konan');
    await user.type(screen.getByTestId('input-prenoms'), 'Elie');
    await user.type(screen.getByTestId('input-email'), 'konan@test.ci');
    await user.type(screen.getByTestId('input-secteur'), 'Finance');
    await user.selectOptions(screen.getByTestId('select-organisation'), 'org-1');
    fireEvent.submit(screen.getByTestId('form-creer-apprenant'));
    await waitFor(() => {
      expect(screen.getByText('Organisation introuvable')).toBeInTheDocument();
    });
  });

  it('bouton "Creer un autre compte" reaffiche le formulaire vide', async () => {
    const user = userEvent.setup();
    apprenantsApi.create.mockResolvedValue({
      data: { id: 'abc-123', email: 'test@ci', mot_de_passe_temp: 'Pass1!', statut: 'ACTIF' },
    });
    renderComponent();
    await waitFor(() => screen.getByTestId('form-creer-apprenant'));
    await user.type(screen.getByTestId('input-nom'), 'X');
    await user.type(screen.getByTestId('input-prenoms'), 'Y');
    await user.type(screen.getByTestId('input-email'), 'test@ci');
    await user.type(screen.getByTestId('input-secteur'), 'IT');
    fireEvent.submit(screen.getByTestId('form-creer-apprenant'));
    await waitFor(() => screen.getByTestId('success-title'));
    await user.click(screen.getByText('Creer un autre compte'));
    await waitFor(() => {
      expect(screen.getByTestId('form-creer-apprenant')).toBeInTheDocument();
    });
  });

  it('charge la liste des organisations au montage', async () => {
    organisationsApi.getAll.mockResolvedValue({
      data: { data: [{ id: 'org-1', raison_sociale: 'ANSSI CI' }] },
    });
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('ANSSI CI')).toBeInTheDocument();
    });
  });

  it('bouton Annuler navigue vers /backoffice/apprenants', async () => {
    const user = userEvent.setup();
    renderComponent();
    await waitFor(() => screen.getByTestId('form-creer-apprenant'));
    await user.click(screen.getByText('Annuler'));
    expect(mockNavigate).toHaveBeenCalledWith('/backoffice/apprenants');
  });
});
