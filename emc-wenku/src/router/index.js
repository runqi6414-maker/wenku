import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../store/auth'
import { pinia } from '../store/pinia'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: () => import('../views/Home.vue') },
    { path: '/literature', name: 'literature-list', component: () => import('../views/Home.vue') },
    {
      path: '/search',
      name: 'search',
      redirect: (to) => ({ name: 'literature-list', query: to.query }),
    },
    {
      path: '/literature/:id',
      name: 'literature-detail',
      component: () => import('../views/Detail.vue'),
    },
    { path: '/detail/:id', name: 'detail', component: () => import('../views/Detail.vue') },
    { path: '/profile', redirect: { name: 'me' } },
    {
      path: '/me',
      name: 'me',
      component: () => import('../views/Profile.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/me/favorites',
      name: 'favorites',
      component: () => import('../views/Profile.vue'),
      meta: { requiresAuth: true },
    },
    { path: '/login', name: 'login', component: () => import('../views/Login.vue') },
    { path: '/register', name: 'register', component: () => import('../views/Register.vue') },
    {
      path: '/forgot-password',
      name: 'forgot-password',
      component: () => import('../views/ForgotPassword.vue'),
    },
    {
      path: '/submit',
      name: 'submit',
      component: () => import('../views/SubmissionForm.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/submissions',
      name: 'my-submissions',
      component: () => import('../views/MySubmissions.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/submissions/:id',
      name: 'submission-detail',
      component: () => import('../views/SubmissionDetail.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/submissions/:id/edit',
      name: 'submission-edit',
      component: () => import('../views/SubmissionForm.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/literature/political-subcategories',
      name: 'political-subcategories',
      component: () => import('../views/Periods.vue'),
    },
    {
      path: '/literature/political-subcategories/:id',
      name: 'political-subcategory-detail',
      component: () => import('../views/PeriodDetail.vue'),
    },
    { path: '/periods', redirect: { name: 'political-subcategories' } },
    {
      path: '/periods/:id',
      redirect: (to) => ({ name: 'political-subcategory-detail', params: { id: to.params.id } }),
    },
    {
      path: '/about-documents',
      name: 'meta-documents',
      component: () => import('../views/MetaDocuments.vue'),
    },
    {
      path: '/about-documents/:slug',
      name: 'meta-document-detail',
      component: () => import('../views/MetaDocumentDetail.vue'),
    },
    {
      path: '/admin',
      name: 'admin',
      component: () => import('../views/Admin.vue'),
      meta: { requiresAuth: true, roles: ['ADMIN', 'REVIEWER'] },
    },
    {
      path: '/admin/categories',
      name: 'admin-categories',
      component: () => import('../views/AdminTaxonomy.vue'),
      meta: { requiresAuth: true, roles: ['ADMIN'] },
    },
    {
      path: '/admin/literature',
      name: 'admin-literature',
      component: () => import('../views/AdminLiterature.vue'),
      meta: { requiresAuth: true, roles: ['ADMIN'] },
    },
    {
      path: '/admin/political-subcategories',
      name: 'admin-political-subcategories',
      component: () => import('../views/AdminTaxonomy.vue'),
      meta: { requiresAuth: true, roles: ['ADMIN'] },
    },
    { path: '/admin/periods', redirect: { name: 'admin-political-subcategories' } },
    {
      path: '/admin/meta-documents',
      name: 'admin-meta-documents',
      component: () => import('../views/AdminMetaDocuments.vue'),
      meta: { requiresAuth: true, roles: ['ADMIN'] },
    },
    {
      path: '/admin/users',
      name: 'admin-users',
      component: () => import('../views/AdminUsers.vue'),
      meta: { requiresAuth: true, roles: ['ADMIN'] },
    },
    {
      path: '/admin/audit-logs',
      name: 'admin-audit-logs',
      component: () => import('../views/AdminAuditLogs.vue'),
      meta: { requiresAuth: true, roles: ['ADMIN'] },
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('../views/NotFound.vue'),
    },
  ],
  scrollBehavior() {
    return { top: 0 }
  },
})

router.beforeEach(async (to) => {
  const auth = useAuthStore(pinia)
  if (to.meta.requiresAuth) {
    const user = await auth.ensureLoaded()
    if (!user) return { name: 'login', query: { redirect: to.fullPath } }
    if (to.meta.roles && !to.meta.roles.includes(user.role)) return { name: 'home' }
  }
})

export default router
