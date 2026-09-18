export function onRequestGet({env}) {
 return Response.json({configured:!!env.TYPESAFE_API_KEY},{headers:{'Cache-Control':'no-store'}});
}
