import { createRouter, createWebHashHistory } from 'vue-router'
import Home from '../views/Home.vue'
import IntervalTraining from '../views/IntervalTraining.vue'
import Tools from '../views/Tools.vue'
import Projects from '../views/Projects.vue'
import About from '../views/About.vue'

const routes = [
  { path: '/', component: Home },
  { path: '/interval-training', component: IntervalTraining },
  { path: '/tools', component: Tools },
  { path: '/projects', component: Projects },
  { path: '/about', component: About }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
