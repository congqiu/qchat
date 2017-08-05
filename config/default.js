module.exports = {
	port: 3000,
	baseUrl: 'http://www.chat.xyz',
	proxy: 'http://10.1.0.19:3000',
	static: '//static.qiucong.xin',
	session: {
		secret: 'qChat',
		key: 'qChat',
		maxAge: 25920000
	},
	redis: {
		host: '127.0.0.1',
		port: '6379'
	}
}