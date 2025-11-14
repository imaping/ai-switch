export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  await deleteRemoteEnvironment(id)
  return { success: true }
})
