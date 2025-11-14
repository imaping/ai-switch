export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  await deleteCodexEnvironment(id)
  return { success: true }
})
