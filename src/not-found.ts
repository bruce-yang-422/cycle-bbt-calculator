import { createApp, h } from 'vue'
import { language, t } from './i18n'
import '../css/not-found.css'

document.documentElement.lang = language.value
document.title = `404 · ${t('notFound.title')}`
const description = document.querySelector<HTMLMetaElement>('meta[name="description"]')
if (description) description.content = t('notFound.body')

const base = import.meta.env.BASE_URL
const mountPoint = document.getElementById('app')
if (mountPoint) {
  mountPoint.classList.add('container')
  createApp({
    render: () => h('main', [
      h('div', { class: 'code' }, '404'),
      h('h1', t('notFound.title')),
      h('p', t('notFound.body')),
      h('a', { id: 'homeLink', href: `${base}?lang=${language.value}` }, t('notFound.home')),
    ]),
  }).mount(mountPoint)
}
