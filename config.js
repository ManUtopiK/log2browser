var config;

config = {
	logFiles: [
		{
			file: '/private/var/log/apache2/access_log',
			replace: ['(\\\/\\\d{4}):', '$1 '],
			regexData: '\\['+
						'(?<date>[^\\]]*)'+
						'\\]\\s'+
						'(?<message>"[^"]*"'+
						'\\s'+
						'(?<info>\\d{3})'+
						'.*)'
		},
		{
			file: '/private/var/log/apache2/error_log',
			regexData: '^\\['+
					'(?<date> [^\\]]*)'+
					'\\]\\s\\['+
					'(?<error> [^\\]]*)'+
					'\\]\\s\\['+
					'(?<pid> [^\\]]*)'+
					'\\]\\s\\['+
					'(?<client> [^\\]]*)'+
					'\\]\\s'+
					'(?<info> [^\\:\\.]*)'+
					'[\\:\\.]'+
					'(?<message> .*)'
		}
	]
};

module.exports = config;
